// =============================================================================
// Pricing Types
// =============================================================================

/** A public pricing plan (no auth required). */
export interface PricingPlan {
    /** Plan name */
    name: string;
    /** Price display string (e.g., "$29/mo") */
    price: string;
    /** Billing period */
    period: string;
    /** Plan description */
    description: string;
    /** Feature list */
    features: string[];
    /** Whether this is the recommended plan */
    isPopular: boolean;
    /** Call-to-action text */
    cta: string;
    /** Call-to-action link */
    ctaLink: string;
    /** @deprecated The API sends this as `isPopular`. */
    is_popular?: boolean;
    /** @deprecated The API sends this as `ctaLink`. */
    cta_link?: string;
}

/** Result from `GET /api/v1/pricing`. */
export interface PricingResult {
    /** Available pricing plans */
    plans: PricingPlan[];
}

/** A detailed pricing plan (requires auth). */
export interface PricingDetailPlan {
    /** Plan ID */
    id: string;
    /** Plan name */
    name: string;
    /** Tier identifier */
    tier: string;
    /** Plan description */
    description: string;
    /** Monthly price in USD */
    price_monthly: number;
    /** Yearly price in USD */
    price_yearly: number;
    /** Monthly API call limit */
    api_calls_per_month: number;
    /** Requests per minute rate limit */
    rate_limit: number;
    /** Feature list */
    features: string[];
    /** Whether this is the recommended plan */
    is_popular: boolean;
}

/** Result from `GET /api/v1/pricing/details`. */
export interface PricingDetailsResult {
    /** Detailed pricing plans */
    plans: PricingDetailPlan[];
}
