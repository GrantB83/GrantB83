# Sprint 3 T+U screenshots

Fixture guests only (`Alex Guest`, `Jordan Booker`). Never real guest PII.

Captured against local `/?fixture=1` at 25 Sep 2026.

| Scene | Path |
| --- | --- |
| Phone list ~390×844 | [phone-list-390x844.png](./phone-list-390x844.png) |
| Phone thread ~390×844 | [phone-thread-390x844.png](./phone-thread-390x844.png) |
| Desktop thread ~1280×800 | [desktop-thread-1280x800.png](./desktop-thread-1280x800.png) |

## Measured (Playwright, invented fixture)

| Check | Result |
| --- | --- |
| Phone chrome after list/thread scroll | `top: 0`, height 86px (banner + nav) |
| Phone shell top | 86px (equals chrome once; `main` padding-top 0) |
| Phone list preview width | 373 / 390 = 95.6% (≥90%) |
| Phone Approve&Send | in viewport (`top` 788, `bottom` 832, vh 844) |
| Desktop ~1280×800 messages | 244px (≥240 and ≥35% of 698px shell) |
| Desktop composer | 296px (≤50% of 698px shell) |
| Desktop chrome vs shell top | 102px = 102px (no double-count) |
