// src/services/providerLimits.ts
import type { ProviderLimits } from "../types";

export class ProviderDetection {
  static detectProvider(smtpHost: string): ProviderLimits {
    const host = smtpHost.toLowerCase();

    if (host.includes("gmail")) {
      return { dailyLimit: 100, name: "Gmail", recommendedBatchSize: 20, recommendedDelay: 45 };
    }
    if (host.includes("outlook") || host.includes("hotmail") || host.includes("live")) {
      return { dailyLimit: 300, name: "Outlook/Hotmail", recommendedBatchSize: 50, recommendedDelay: 30 };
    }
    if (host.includes("yahoo")) {
      return { dailyLimit: 100, name: "Yahoo", recommendedBatchSize: 20, recommendedDelay: 45 };
    }
    return { dailyLimit: 10000, name: "Custom SMTP", recommendedBatchSize: 100, recommendedDelay: 15 };
  }

  static calculateMaxContacts(smtpHost: string, hasNotification: boolean): number {
    const limits = this.detectProvider(smtpHost);
    if (hasNotification && limits.name !== "Custom SMTP") {
      return limits.dailyLimit - 1;
    }
    return limits.dailyLimit;
  }
}
