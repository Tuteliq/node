import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `require("@tuteliq/sdk")` must load the CommonJS build (#70). The package is `"type": "module"`, so the `.js` files
 * in dist/cjs load as CommonJS only when dist/cjs carries its own `{"type": "commonjs"}`.
 *
 * Runs against the built package, resolved through its own `exports`, in a separate Node process. CI builds before it
 * tests; run `npm run build` first locally.
 */
const root = join(import.meta.dirname, '..');
const built = existsSync(join(root, 'dist', 'cjs', 'index.js'));

describe.skipIf(!built)('the CommonJS entry points', () => {
    it.each([
        ['@tuteliq/sdk', 'Tuteliq'],
        ['@tuteliq/sdk/constants', 'VerificationCheck'],
        ['@tuteliq/sdk/types', null],
    ])('require("%s") loads', (specifier, exported) => {
        const script = `const m = require(${JSON.stringify(specifier)}); process.stdout.write(typeof m === 'object' ? 'ok:' + ${exported ? `typeof m[${JSON.stringify(exported)}]` : "'object'"} : 'bad');`;
        const out = execFileSync(process.execPath, ['-e', script], { cwd: root, encoding: 'utf8' });
        expect(out).toBe(exported ? (exported === 'Tuteliq' ? 'ok:function' : 'ok:object') : 'ok:object');
    });
});
