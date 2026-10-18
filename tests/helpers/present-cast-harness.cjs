// Explicit all-present fixture for Expression/Motion/layout unit integration tests.
// Production visit scheduling is covered separately by relationship-free-life-runtime-test.
const vm=require('node:vm');
const {harness:runtimeHarness}=require('./runtime-harness.cjs');
exports.harness=(options={})=>{const h=runtimeHarness(options);
 h.api.setPresentCastFixture();
 return h;
};
