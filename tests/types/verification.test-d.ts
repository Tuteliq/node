import { describe, expectTypeOf, test } from 'vitest';
import type { FaceMatchResult } from '../../src/types/verification.js';
import type { VerifyImageMatchResult } from '../../src/types/media.js';

describe('face match score', () => {
    test('a verification result carries an optional match_score', () => {
        // Optional: an API version before the field leaves it out.
        expectTypeOf<FaceMatchResult['match_score']>().toEqualTypeOf<number | undefined>();
        expectTypeOf<FaceMatchResult['confidence']>().toEqualTypeOf<number>();
    });

    test('an image match carries an optional match_score', () => {
        type ImageFaceMatch = NonNullable<VerifyImageMatchResult['face_match']>;
        expectTypeOf<ImageFaceMatch['match_score']>().toEqualTypeOf<number | undefined>();
    });
});
