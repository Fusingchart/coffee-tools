// Run: node test_logic.js  (extracts the LOGIC block from index.html and tests it)
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/\/\* LOGIC START \*\/([\s\S]*?)\/\* LOGIC END \*\//);
if (!m) { console.error('logic block not found'); process.exit(1); }
const api = new Function(m[1] + '; return {compute, fmtWeight, fmtVolume, METHODS, METHOD_ORDER, CUP_ML, roundTo};')();

let fails = 0;
function eq(name, got, want, tol) {
  const ok = typeof want === 'number' ? Math.abs(got - want) <= (tol || 1e-6) : got === want;
  if (!ok) { fails++; console.log('FAIL', name, 'got', got, 'want', want); } else console.log('ok  ', name);
}

let r = api.compute({ mode: 'water', value: 500, ratio: 16, weightUnit: 'g', volumeUnit: 'ml' });
eq('water 500 @16 coffee', r.coffeeG, 31.25); eq('water 500 water', r.waterMl, 500);

r = api.compute({ mode: 'coffee', value: 20, ratio: 15, weightUnit: 'g', volumeUnit: 'ml' });
eq('coffee 20 @15 water', r.waterMl, 300);

r = api.compute({ mode: 'cups', value: 2, ratio: 16, weightUnit: 'g', volumeUnit: 'ml' });
eq('2 cups water', r.waterMl, 473.176473, 1e-4); eq('2 cups coffee', r.coffeeG, 473.176473 / 16, 1e-4);

r = api.compute({ mode: 'coffee', value: 1, ratio: 16, weightUnit: 'oz', volumeUnit: 'floz' });
eq('1 oz coffee in g', r.coffeeG, 28.349523125); eq('1 oz coffee water', r.waterMl, 28.349523125 * 16);

r = api.compute({ mode: 'water', value: 16, ratio: 16, weightUnit: 'oz', volumeUnit: 'floz' });
eq('16 floz in ml', r.waterMl, 473.176473, 1e-3);

r = api.compute({ mode: 'coffee', value: 18, ratio: 2, weightUnit: 'g', volumeUnit: 'ml' });
eq('espresso 18g 1:2 yield', r.waterMl, 36);

eq('zero invalid', api.compute({ mode: 'water', value: 0, ratio: 16 }).ok, false);
eq('NaN invalid', api.compute({ mode: 'water', value: NaN, ratio: 16 }).ok, false);
eq('ratio 0 invalid', api.compute({ mode: 'water', value: 5, ratio: 0 }).ok, false);
eq('ratio 31 invalid', api.compute({ mode: 'water', value: 5, ratio: 31 }).ok, false);
eq('huge invalid', api.compute({ mode: 'water', value: 1e9, ratio: 16 }).ok, false);
eq('bad mode invalid', api.compute({ mode: 'x', value: 5, ratio: 16 }).ok, false);

eq('fmt g', api.fmtWeight(31.25, 'g'), '31.3 g');
eq('fmt oz', api.fmtWeight(28.349523125, 'oz'), '1.00 oz');
eq('fmt ml', api.fmtVolume(473.18, 'ml'), '473 ml');
eq('fmt floz', api.fmtVolume(473.176473, 'floz'), '16.0 fl oz');

api.METHOD_ORDER.forEach(id => {
  const x = api.METHODS[id];
  eq(id + ' ratio within range', x.ratio >= x.min && x.ratio <= x.max, true);
  eq(id + ' has notes', !!(x.grind && x.time && x.temp && x.tip), true);
});

console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
