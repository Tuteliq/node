import { describe, expectTypeOf, test } from 'vitest';
import type {
    AnalyzeDocumentInput,
    AnalyzeImageInput,
    AnalyzeVideoInput,
    DocumentAnalysisResult,
    ImageAnalysisResult,
    VideoAnalysisResult,
    VoiceAnalysisResult,
} from '../../src/types/media.js';
import type {
    AudioStats,
    DetectSyntheticAudioInput,
    DetectSyntheticImageInput,
    DetectSyntheticVideoInput,
    LipSyncResult,
    SyntheticAudioResult,
    SyntheticImageResult,
    SyntheticVideoResult,
    SyntheticVisionResult,
    TemporalConsistency,
} from '../../src/types/synthetic.js';
import type {
    VoiceAlertEvent,
    VoiceFrameAnalysisEvent,
    VoiceSessionSummaryEvent,
    VoiceStreamConfig,
    VoiceStreamEvent,
    VoiceStreamHandlers,
    VoiceStreamSession,
} from '../../src/types/voice-stream.js';

// Wire shapes, pinned against what each endpoint actually returns.

describe('media inputs', () => {
    test('image and video take flagRiskTerms', () => {
        expectTypeOf<AnalyzeImageInput['flagRiskTerms']>().toEqualTypeOf<boolean | undefined>();
        expectTypeOf<AnalyzeVideoInput['flagRiskTerms']>().toEqualTypeOf<boolean | undefined>();
    });

    test('video takes analysisType and maxFrames', () => {
        expectTypeOf<AnalyzeVideoInput['analysisType']>().toEqualTypeOf<'unsafe' | 'all' | undefined>();
        expectTypeOf<AnalyzeVideoInput['maxFrames']>().toEqualTypeOf<number | undefined>();
    });

    test('document takes splitBySender', () => {
        expectTypeOf<AnalyzeDocumentInput['splitBySender']>().toEqualTypeOf<boolean | undefined>();
    });

    test('synthetic media inputs take fileId', () => {
        expectTypeOf<DetectSyntheticImageInput['fileId']>().toEqualTypeOf<string | undefined>();
        expectTypeOf<DetectSyntheticAudioInput['fileId']>().toEqualTypeOf<string | undefined>();
        expectTypeOf<DetectSyntheticVideoInput['fileId']>().toEqualTypeOf<string | undefined>();
    });
});

describe('media results', () => {
    test('voice reports its language', () => {
        expectTypeOf<VoiceAnalysisResult['language']>().toEqualTypeOf<string | undefined>();
        expectTypeOf<VoiceAnalysisResult['language_status']>().toEqualTypeOf<'stable' | 'beta' | undefined>();
    });

    test('image and video carry risk_terms', () => {
        type RiskTerms = { detected: boolean; matches: Array<{ term: string; category: 'drug' | 'violence' }> } | null | undefined;
        expectTypeOf<ImageAnalysisResult['risk_terms']>().toEqualTypeOf<RiskTerms>();
        expectTypeOf<VideoAnalysisResult['risk_terms']>().toEqualTypeOf<RiskTerms>();
    });

    test('document always returns file_id', () => {
        expectTypeOf<DocumentAnalysisResult['file_id']>().toEqualTypeOf<string>();
    });
});

describe('synthetic results', () => {
    test('image returns semantic_analysis, not vision', () => {
        expectTypeOf<SyntheticImageResult['semantic_analysis']>().toEqualTypeOf<SyntheticVisionResult>();
        expectTypeOf<SyntheticImageResult['vision']>().toEqualTypeOf<SyntheticVisionResult | undefined>();
    });

    test('image returns the screenshot and deep image summaries and echoes', () => {
        expectTypeOf<SyntheticImageResult>().toHaveProperty('screenshot_detection');
        expectTypeOf<SyntheticImageResult>().toHaveProperty('deep_image_analysis');
        expectTypeOf<SyntheticImageResult['file_id']>().toEqualTypeOf<string | undefined>();
        expectTypeOf<SyntheticImageResult['metadata']>().toEqualTypeOf<Record<string, unknown> | undefined>();
    });

    test('audio stats use the field names the API sends', () => {
        expectTypeOf<AudioStats['rms_level']>().toEqualTypeOf<number>();
        expectTypeOf<AudioStats['peak_count']>().toEqualTypeOf<number>();
        expectTypeOf<AudioStats['rms_mean']>().toEqualTypeOf<number | undefined>();
    });

    test('audio transcription may come without segments', () => {
        type Transcription = NonNullable<SyntheticAudioResult['transcription']>;
        expectTypeOf<Transcription['segments']>().toEqualTypeOf<Array<{ start: number; end: number; text: string }> | undefined>();
        expectTypeOf<SyntheticAudioResult>().toHaveProperty('audio_forensics');
        expectTypeOf<SyntheticAudioResult['file_id']>().toEqualTypeOf<string | undefined>();
    });

    test('video temporal consistency and lip sync match the wire', () => {
        expectTypeOf<TemporalConsistency['score']>().toEqualTypeOf<number>();
        expectTypeOf<TemporalConsistency['identity_consistency']>().toEqualTypeOf<number>();
        expectTypeOf<TemporalConsistency['landmark_stability']>().toEqualTypeOf<number>();
        expectTypeOf<TemporalConsistency['anomalous_pairs']>().toEqualTypeOf<Array<{ frame_a: number; frame_b: number; distance: number }>>();
        expectTypeOf<LipSyncResult['signals']>().toEqualTypeOf<string[] | undefined>();
    });

    test('video returns drift_signature, language_status, forensic and audio summaries', () => {
        expectTypeOf<SyntheticVideoResult['drift_signature']>().toEqualTypeOf<'sawtooth' | 'sinusoidal' | 'stable' | undefined>();
        expectTypeOf<SyntheticVideoResult['language_status']>().toEqualTypeOf<'stable' | 'beta' | undefined>();
        expectTypeOf<SyntheticVideoResult>().toHaveProperty('forensic_signals');
        expectTypeOf<SyntheticVideoResult>().toHaveProperty('audio_forensics');
        expectTypeOf<SyntheticVideoResult['file_id']>().toEqualTypeOf<string | undefined>();
    });
});

describe('voice stream', () => {
    test('config takes video options, childAge and the all analysis type', () => {
        expectTypeOf<VoiceStreamConfig['enableVideo']>().toEqualTypeOf<boolean | undefined>();
        expectTypeOf<VoiceStreamConfig['frameIntervalSeconds']>().toEqualTypeOf<number | undefined>();
        expectTypeOf<NonNullable<VoiceStreamConfig['context']>['childAge']>().toEqualTypeOf<number | undefined>();
        expectTypeOf<'all'>().toMatchTypeOf<NonNullable<VoiceStreamConfig['analysisTypes']>[number]>();
    });

    test('frame analysis is a stream event with its own handler', () => {
        expectTypeOf<VoiceFrameAnalysisEvent>().toMatchTypeOf<VoiceStreamEvent>();
        expectTypeOf<VoiceStreamHandlers['onFrameAnalysis']>().toEqualTypeOf<((event: VoiceFrameAnalysisEvent) => void) | undefined>();
        expectTypeOf<VoiceStreamSession['sendVideoFrame']>().toEqualTypeOf<(data: Buffer | Uint8Array) => void>();
    });

    test('alerts and summaries carry the visual category and frame count', () => {
        expectTypeOf<VoiceAlertEvent['category']>().toEqualTypeOf<'bullying' | 'unsafe' | 'grooming' | 'emotions' | 'visual'>();
        expectTypeOf<VoiceSessionSummaryEvent['video_frames_analyzed']>().toEqualTypeOf<number>();
        expectTypeOf<VoiceSessionSummaryEvent['overall_risk']>().toEqualTypeOf<'low' | 'medium' | 'high' | 'critical'>();
    });
});
