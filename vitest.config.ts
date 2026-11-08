import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        // Type-level tests: a result type that names a field the API does not
        // send passes every runtime test, so wire shapes are pinned with tsc.
        typecheck: {
            enabled: true,
            include: ['tests/types/**/*.test-d.ts'],
            tsconfig: './tsconfig.typecheck.json',
        },
    },
});
