import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ReplyRule } from "@prisma/client";

interface EmbeddingResponse {
  data?: Array<{ index: number; embedding: number[] }>;
}

export interface SemanticMatch {
  rule: ReplyRule;
  score: number;
}

@Injectable()
export class SemanticMatcherService {
  private readonly logger = new Logger(SemanticMatcherService.name);
  private readonly triggerCache = new Map<string, number[]>();

  constructor(private readonly config: ConfigService) {}

  async findBestMatch(message: string, rules: ReplyRule[]): Promise<SemanticMatch | null> {
    const model = this.config.get<string>("ELYRA_SEMANTIC_MODEL")?.trim() || "text-embedding-3-small";
    const threshold = this.readThreshold();
    const winnerMargin = this.readWinnerMargin();

    if (rules.length === 0) {
      this.logger.log("Semantic result: SKIP reason=no_semantic_rules");
      return null;
    }

    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      this.logger.warn("Semantic result: SKIP reason=missing_OPENAI_API_KEY");
      return null;
    }

    try {
      const messageVector = (await this.embed([message], apiKey, model))[0];
      const uniqueTriggers = [...new Set(rules.flatMap((rule) => rule.triggers.map((value) => value.trim())).filter(Boolean))];
      const triggerVectors = await this.getTriggerVectors(uniqueTriggers, apiKey, model);

      const candidates: SemanticMatch[] = [];
      for (const rule of rules) {
        let ruleScore = -1;
        for (const trigger of rule.triggers) {
          const vector = triggerVectors.get(trigger.trim());
          if (!vector) continue;
          ruleScore = Math.max(ruleScore, this.cosineSimilarity(messageVector, vector));
        }

        if (ruleScore >= -1) {
          candidates.push({ rule, score: ruleScore });
        }
      }

      candidates.sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return right.rule.priority - left.rule.priority;
      });

      const bestCandidate = candidates[0];
      if (!bestCandidate) {
        this.logger.log("Semantic result: NO_MATCH reason=no_candidate_vectors");
        return null;
      }

      const runnerUp = candidates[1] ?? null;
      const score = bestCandidate.score;
      const margin = runnerUp ? score - runnerUp.score : Number.POSITIVE_INFINITY;
      const passesThreshold = score >= threshold;
      const passesMargin = !runnerUp || margin >= winnerMargin;
      const outcome = passesThreshold && passesMargin ? "MATCH" : "NO_MATCH";

      if (outcome === "MATCH") {
        this.logger.log(
          `Semantic MATCH rule=${JSON.stringify(bestCandidate.rule.name)} ruleId=${bestCandidate.rule.id} score=${score.toFixed(4)}${runnerUp ? ` margin=${margin.toFixed(4)}` : ""}`,
        );
      }

      if (!passesThreshold) {
        this.logger.log(`Semantic NO_MATCH reason=below_threshold score=${score.toFixed(4)}`);
        return null;
      }

      if (!passesMargin) {
        this.logger.log(
          `Semantic NO_MATCH reason=ambiguous_winner score=${score.toFixed(4)} margin=${margin.toFixed(4)}`,
        );
        return null;
      }

      return bestCandidate;
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Unknown semantic provider error";
      this.logger.warn(`Semantic result: ERROR provider=openai; falling back safely. ${messageText}`);
      return null;
    }
  }

  private async getTriggerVectors(
    triggers: string[],
    apiKey: string,
    model: string,
  ): Promise<Map<string, number[]>> {
    const result = new Map<string, number[]>();
    const missing: string[] = [];

    for (const trigger of triggers) {
      const key = `${model}\u0000${trigger}`;
      const cached = this.triggerCache.get(key);
      if (cached) result.set(trigger, cached);
      else missing.push(trigger);
    }

    if (missing.length > 0) {
      const vectors = await this.embed(missing, apiKey, model);
      missing.forEach((trigger, index) => {
        const vector = vectors[index];
        this.triggerCache.set(`${model}\u0000${trigger}`, vector);
        result.set(trigger, vector);
      });
    }

    return result;
  }

  private async embed(inputs: string[], apiKey: string, model: string): Promise<number[][]> {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: inputs,
        model,
        encoding_format: "float",
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      const body = (await response.text()).slice(0, 500);
      throw new Error(`Embedding API returned ${response.status}: ${body}`);
    }

    const payload = (await response.json()) as EmbeddingResponse;
    const ordered = [...(payload.data ?? [])].sort((a, b) => a.index - b.index);
    if (ordered.length !== inputs.length || ordered.some((item) => !Array.isArray(item.embedding))) {
      throw new Error("Embedding API returned an unexpected response.");
    }
    return ordered.map((item) => item.embedding);
  }

  private readThreshold(): number {
    const raw = Number(this.config.get<string>("ELYRA_SEMANTIC_THRESHOLD") ?? "0.55");
    return Number.isFinite(raw) && raw >= -1 && raw <= 1 ? raw : 0.55;
  }

  private readWinnerMargin(): number {
    const raw = Number(this.config.get<string>("ELYRA_SEMANTIC_WINNER_MARGIN") ?? "0.08");
    return Number.isFinite(raw) && raw >= 0 && raw <= 2 ? raw : 0.08;
  }

  private cosineSimilarity(left: number[], right: number[]): number {
    if (left.length === 0 || left.length !== right.length) return -1;
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    for (let index = 0; index < left.length; index += 1) {
      dot += left[index] * right[index];
      leftNorm += left[index] * left[index];
      rightNorm += right[index] * right[index];
    }
    const denominator = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
    return denominator === 0 ? -1 : dot / denominator;
  }
}
