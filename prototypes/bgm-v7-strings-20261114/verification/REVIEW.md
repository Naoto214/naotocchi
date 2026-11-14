# Review and validation

Independent read-only review of native-sample roots, length bounds, correlated same-pitch crossfades and explicit phrase rests found no critical DSP/preservation defect. All phrase boundaries retain dry silence (minimum0.375s). Cache omission of diagnostic files/dependency hashes was identified and fixed; refreshed renders and eight cache skips verified. Public source descriptions were corrected for A/B1/B2 and the dry reconstruction. No subjective listening was claimed.

Chromium and Linux WebKit: all12 full AAC and12 dry AAC decode, common position/gain, climax jumps, loop, output interruption/reconnection and independent native audio tests pass. Native WebKit needed its /var/tmp media cache write access. Physical iPhone playback is not an automated result: earlier speaker-check-1 output code was user-confirmed; this new comparison and string preference await user listening.

Audio metrics and original hashes: audio-summary.json. Output hashes: artifacts.json. All8 full mixes approx−23LUFS, truepeak−5.42..−4.00dBTP, zero clipped samples, mono loss−1.31..−1.17dB. All12 diagnostic clips approx−26LUFS. No limiter. Night first-half pre-encode residual is numerically zero (reported near−300dB numerical floor), global gain1. Other global gains1.0116..1.0316 are constant and documented.

Join dip metrics use20ms RMS minimum/maximum within±350ms of the explicitly authored83 joins. Old extremely negative values indicate digital silence, not physical noise-floor measurement; these are not a timbre or beauty score.

Published comparison: https://naoto214.github.io/naotocchi-playtest/bgm-v7-strings/ . Pages run43564483367 succeeded at preview commit1f221c3d012c229ff29e37feb7d2b9de3f63776f. TLS/SHA256 verified41 live assets including24AAC and originalV7 files. Preview diff adds31 files only; productionmain and PR547 branch remain unchanged.
