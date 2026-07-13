// =============================================================================
// Policy Automation Rules
// =============================================================================

/** Severity levels used by policy rule conditions. */
export type RuleSeverity = 'low' | 'medium' | 'high' | 'critical';

/** Action types a policy rule can take when its conditions match. */
export type RuleActionType = 'block' | 'flag' | 'escalate' | 'notify' | 'log_only';

/** Conditions that must all match for a rule to fire. */
export interface PolicyRuleConditions {
    /** Minimum risk score (0-1) for the rule to match */
    min_risk_score?: number;
    /** Minimum severity for the rule to match */
    min_severity?: RuleSeverity;
    /** Only match these detected categories */
    categories?: string[];
    /** Only match these age groups */
    age_groups?: string[];
}

/** Action taken when a rule's conditions match. */
export interface PolicyRuleAction {
    /** What to do when the rule matches */
    type: RuleActionType;
    /** Escalation target (e.g., email or team identifier) */
    escalate_to?: string;
    /** Notification channel (e.g., slack, email) */
    notify_channel?: string;
    /** Custom message/reason attached to the action */
    message?: string;
    /** Override the detected severity */
    override_severity?: string;
}

/** A policy automation rule. */
export interface PolicyRule {
    /** Rule ID */
    id: string;
    /** Display name */
    name: string;
    /** Whether the rule is active */
    enabled: boolean;
    /** Detection endpoints this rule applies to (e.g., "bullying", "grooming") */
    endpoints: string[];
    /** Match conditions (all must match) */
    conditions: PolicyRuleConditions;
    /** Action taken on match */
    action: PolicyRuleAction;
    /** Evaluation priority (lower first) */
    priority: number;
    /** ISO 8601 creation timestamp */
    created_at: string;
    /** ISO 8601 last-update timestamp */
    updated_at: string;
}

/** Input for creating a policy rule. */
export interface CreatePolicyRuleInput {
    /** Display name */
    name: string;
    /** Whether the rule is active */
    enabled: boolean;
    /** Detection endpoints this rule applies to (min 1) */
    endpoints: string[];
    /** Match conditions */
    conditions: PolicyRuleConditions;
    /** Action taken on match */
    action: PolicyRuleAction;
    /** Evaluation priority (>= 0) */
    priority: number;
}

/** Input for updating a policy rule — any subset of fields. */
export type UpdatePolicyRuleInput = Partial<CreatePolicyRuleInput>;

/** Result of listing policy rules. */
export interface ListPolicyRulesResult {
    success: boolean;
    rules: PolicyRule[];
}

/** Result wrapping a single policy rule. */
export interface PolicyRuleResult {
    success: boolean;
    rule: PolicyRule;
}

/** Result of deleting a policy rule. */
export interface DeletePolicyRuleResult {
    success: boolean;
    message: string;
}

/** Input for test-evaluating rules against a hypothetical detection result. */
export interface EvaluatePolicyRulesInput {
    /** Detection endpoint the result came from (e.g., "bullying") */
    endpoint: string;
    /** Risk score of the detection (0-1) */
    risk_score: number;
    /** Severity of the detection */
    severity: RuleSeverity;
    /** Detected categories */
    categories: string[];
    /** Optional age group of the subject */
    age_group?: string;
}

/** A rule that matched during evaluation. */
export interface MatchedPolicyRule {
    rule_id: string;
    rule_name: string;
    action: string;
    priority: number;
}

/** Result of test-evaluating policy rules. */
export interface EvaluatePolicyRulesResult {
    success: boolean;
    evaluation: {
        rules_evaluated: number;
        rules_matched: MatchedPolicyRule[];
        /** The winning action after priority resolution */
        policy_action: string;
        policy_message: string;
        /** ID of the rule whose action was applied */
        applied_rule: string;
    };
}
