# Cascade Framework > vendored sources

`cascade-ohniva.css` is assembled from the Cascade Framework development sources
at commit `5863cb6627b59641b968ef45fb3699300d9c67f3`. The framework is MIT
licensed; `LICENSE-cascade.txt` in this directory carries the notice.

| module | source sha256 |
|---|---|
| `core.css` | `5458c8688750c761430ddbc174ece42eae3e7786a1aa54d3acae64da1394b3a4` |
| `typography.css` | `956c138f960458519615a0ff9934379a1e7749a7c1da66ce03aadc4745c394fc` |
| `grids.css` | `6cae2c972c95d42938480a523f1f02818e66ee7ea3b80b04ee8627ce84c65105` |
| `helpers.css` | `8d47827ea6041d32b83ec9cf710f3d8a21a7c68837fe2ab1acf0abea7dfb44ba` |
| `responsive.css` | `c4f43502feb02b6d50792cdd7bddd377dc0111eac94358e9e75d8566d8799d34` |

Every class selector carries the `oh-c-` prefix, so the framework vocabulary
cannot collide with another theme's classes. The FontAwesome face and the
`.icon` rule are removed because this theme ships no icon font.
