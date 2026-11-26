import { describe, expectTypeOf, test } from 'vitest';
import type { ActionPlanResult, GetActionPlanInput } from '../../src/types/guidance.js';

describe('action plan', () => {
    test('a result carries an optional general_guidance flag', () => {
        // Absent unless true: the plan is general guidance for any harm.
        expectTypeOf<ActionPlanResult['general_guidance']>().toEqualTypeOf<boolean | undefined>();
    });

    test('the input takes an optional country', () => {
        expectTypeOf<GetActionPlanInput['country']>().toEqualTypeOf<string | undefined>();
    });
});
