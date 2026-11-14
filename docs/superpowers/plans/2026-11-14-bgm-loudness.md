# BGM final loudness implementation plan

User specification and previous audit provide authorization and design constraints. Inline execution.

- [x] Pin PR549 and preview baseline, trace every audio route; fail regression for0.36 parity.
- [x] Add minimal explicit subapp gain and cache references; verify BGM-only constant scale and original audio hashes.
- [x] Analyze64 AAC/FLAC files: EBU128/M/S/LRA/TP, band energy, mono, sections;3 generic speaker sensitivity models.
- [x] Compute/render real-route transitions with fades, overlap and ducking; test browser graph/routes/rapid switching/save/SFX and output regression.
- [ ] Independent review, Draft PR, preview deploy, verify live code/audio hashes and protected refs; final report.
