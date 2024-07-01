# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [5.0.0](https://github.com/umatch-oficial/query/compare/v4.2.0...v5.0.0) (2024-07-01)


### ⚠ BREAKING CHANGES

* removed dictionary support from query.whereIn() and query.whereNotIn().
* changed the signature of Query.init() and removed Query.getTableAndAlias().

### Features

* add 'alias' argument to query.from() ([2efbc99](https://github.com/umatch-oficial/query/commit/2efbc994a0ffa1bb474dc2a0223f6812ceb62b0d))
* add 'getAlias' parameter to Query.init() ([664a4f7](https://github.com/umatch-oficial/query/commit/664a4f7e658a44689c2d5284b78e72ad9a38938b))
* add query.whereAfter() and query.whereBefore() ([595cae1](https://github.com/umatch-oficial/query/commit/595cae1b68332767e564122f54f330451d35a5c8))
* add query.whereContains() and query.whereContainedIn() ([2b13e9d](https://github.com/umatch-oficial/query/commit/2b13e9db400a4f35d318e2cfb828f28442eece51))
* allow subquery in query.whereIn() and query.whereNotIn() ([d100c13](https://github.com/umatch-oficial/query/commit/d100c13f3a83bbd9c4771e15415c7136defbeb5a))
* remove dictionary support from query.whereIn() and query.whereNotIn() ([1988123](https://github.com/umatch-oficial/query/commit/1988123c1cd752b0c3550797df739d2cb4aa28a2))


### Bug Fixes

* fix default alias in query.with() when passed a string ([a2d5fd0](https://github.com/umatch-oficial/query/commit/a2d5fd0c29442ccc89c131ecbeea7969caf0c1be))

## [4.2.0](https://github.com/umatch-oficial/query/compare/v4.1.0...v4.2.0) (2024-05-24)


### Features

* omit 'AS alias' in joins if the alias is equal to the table name ([56634a5](https://github.com/umatch-oficial/query/commit/56634a5a1e4076ad17ce4c3e1b30fdd4e4069dcf))
* override subquery's alias if a new one is passed to Query.with() ([9c24efc](https://github.com/umatch-oficial/query/commit/9c24efcbfefb832c9dada459b17a082b523b266b))

## [4.1.0](https://github.com/umatch-oficial/query/compare/v4.0.1...v4.1.0) (2024-05-16)


### Features

* add type parameter to Query.clear() and Query.clone() to specify return type ([6c4044c](https://github.com/umatch-oficial/query/commit/6c4044c8c49a668e3699873f2d8ec839aa316fcc))

## [4.0.1](https://github.com/umatch-oficial/query/compare/v4.0.0...v4.0.1) (2024-02-28)


### Bug Fixes

* allow And() in Query.where() ([27a1c62](https://github.com/umatch-oficial/query/commit/27a1c622c9831ffbac94b29fac65623e03fbe042))

## [4.0.0](https://github.com/umatch-oficial/query/compare/v3.14.4...v4.0.0) (2023-12-13)


### ⚠ BREAKING CHANGES

* removed the ability to pass an object of conditions to the query builder constructor.

### Features

* restrict query builder to fluent notation only ([d8ae3a2](https://github.com/umatch-oficial/query/commit/d8ae3a2fc79de01933eaa7b2916f6d253157dabc))

## [3.14.4](https://github.com/umatch-oficial/query/compare/v3.14.3...v3.14.4) (2023-12-13)

## [3.14.3](https://github.com/umatch-oficial/query/compare/v3.14.2...v3.14.3) (2023-12-01)


### Bug Fixes

* fix arguments in Query.whereIn() and Query.whereNotIn() ([0b61086](https://github.com/umatch-oficial/query/commit/0b610863a9f78cade851299b98a8fb99cff545dd))

## [3.14.2](https://github.com/umatch-oficial/query/compare/v3.14.1...v3.14.2) (2023-12-01)


### Bug Fixes

* add RawValue to allowed arguments in Query.whereIn() and Query.whereNotIn() ([951dadd](https://github.com/umatch-oficial/query/commit/951dadd362cff0b1464724903e374f86f04ea81b))

## [3.14.1](https://github.com/umatch-oficial/query/compare/v3.14.0...v3.14.1) (2023-11-27)

## [3.14.0](https://github.com/umatch-oficial/query/compare/v3.13.0...v3.14.0) (2023-11-27)


### Features

* allow RawValue in And/Or and improve JSDocs ([1e6fcbb](https://github.com/umatch-oficial/query/commit/1e6fcbb9f407dc17227ba985ff0cc705ba1f6c95))

## [3.13.0](https://github.com/umatch-oficial/query/compare/v3.12.0...v3.13.0) (2023-08-08)


### Features

* add And ([a58f836](https://github.com/umatch-oficial/query/commit/a58f836bc7d7f3ddec7957d6b1cedbec117cc676))

## [3.12.0](https://github.com/umatch-oficial/query/compare/v3.11.1...v3.12.0) (2023-08-08)


### Features

* add Query.or() ([083214d](https://github.com/umatch-oficial/query/commit/083214d32f709415f14af07bee9e7bb317323f6f))
* export Raw() ([a64030b](https://github.com/umatch-oficial/query/commit/a64030b075d788ae0bd33272969ddc3d62b4ed8c))

## [3.11.1](https://github.com/umatch-oficial/query/compare/v3.11.0...v3.11.1) (2023-07-17)


### Bug Fixes

* **validate-sql:** stop checking for || or + ([1a42379](https://github.com/umatch-oficial/query/commit/1a42379453850a2ea414f696bf9a6a2ef2a590d6))

## [3.11.0](https://github.com/umatch-oficial/query/compare/v3.10.0...v3.11.0) (2023-07-17)


### Features

* add Query.validate() ([b5530d7](https://github.com/umatch-oficial/query/commit/b5530d7371973edea4f12333130bca6541e32f3f))


### Bug Fixes

* remove SQL validation from Query.select() ([371ae01](https://github.com/umatch-oficial/query/commit/371ae010334cf6c0a3e427df90066363a672c1c2))

## [3.10.0](https://github.com/umatch-oficial/query/compare/v3.9.2...v3.10.0) (2023-07-17)


### Features

* add Query.orderByRaw() ([c4da439](https://github.com/umatch-oficial/query/commit/c4da4393a541baf93a59a4c4bfaeb372c44bbf79))

## [3.9.2](https://github.com/umatch-oficial/query/compare/v3.9.1...v3.9.2) (2023-07-14)


### Bug Fixes

* remove SQL validation from whereRaw() and joinRaw() ([0c43bf7](https://github.com/umatch-oficial/query/commit/0c43bf74934d96aaa955c67ae78fe08fd3ef34ca))

## [3.9.1](https://github.com/umatch-oficial/query/compare/v3.9.0...v3.9.1) (2023-07-01)

## [3.9.0](https://github.com/umatch-oficial/query/compare/v3.8.0...v3.9.0) (2023-07-01)


### Features

* add validation against SQL injection ([5062657](https://github.com/umatch-oficial/query/commit/506265754f97097569ad52d4980940e416b86686))

## [3.8.0](https://github.com/umatch-oficial/query/compare/v3.7.0...v3.8.0) (2023-06-27)


### Features

* allow Or in Query join methods ([99c68d7](https://github.com/umatch-oficial/query/commit/99c68d7a9d9647721b11348a2f9ae38b525084e5))

## [3.7.0](https://github.com/umatch-oficial/query/compare/v3.6.1...v3.7.0) (2023-06-26)


### Features

* add Or ([e078017](https://github.com/umatch-oficial/query/commit/e078017ff92af100a77c00fb284d424af64ba774))
* allow Or in Query.where() ([a6b3d7b](https://github.com/umatch-oficial/query/commit/a6b3d7bb5ca5bd6199d8980cb06a6ead9375d1a1))
* remove extra space after IS NULL and add error ([f306b2e](https://github.com/umatch-oficial/query/commit/f306b2eedb1c892b363c1ea2d9f9fa97a753b2c9))


### Bug Fixes

* **entry-to-string:** stop transforming the value when there already is an operator ([75b2a17](https://github.com/umatch-oficial/query/commit/75b2a17abb42816b446cc4ff18ff85fe92ef8630))

## [3.6.1](https://github.com/umatch-oficial/query/compare/v3.6.0...v3.6.1) (2023-06-19)


### Bug Fixes

* use correct limit in Query.forPage() ([c02163b](https://github.com/umatch-oficial/query/commit/c02163b697167018e5a83dac392d93bc6bb253c0))

## [3.6.0](https://github.com/umatch-oficial/query/compare/v3.5.1...v3.6.0) (2023-06-19)


### Features

* export toSQLValue() ([297f9a2](https://github.com/umatch-oficial/query/commit/297f9a265bfad51cf4aa2b266ab046475e5331fc))

## [3.5.1](https://github.com/umatch-oficial/query/compare/v3.5.0...v3.5.1) (2023-06-12)

## [3.5.0](https://github.com/umatch-oficial/query/compare/v3.4.4...v3.5.0) (2023-05-20)


### Features

* automatically convert comparisons with null to IS NULL ([bbbe25b](https://github.com/umatch-oficial/query/commit/bbbe25b94ac2e0ca68766c0141d4285875515434))


### Bug Fixes

* **types:** include RawValue in Primitive ([175837c](https://github.com/umatch-oficial/query/commit/175837c384ebc5a5842850dac1d8965b469b3f49))

## [3.4.4](https://github.com/umatch-oficial/query/compare/v3.4.3...v3.4.4) (2023-05-10)


### Bug Fixes

* Query.clone() when _run is set ([6791c52](https://github.com/umatch-oficial/query/commit/6791c52c2ef27fe2e270eaa71262a6d764b8dd15))

## [3.4.3](https://github.com/umatch-oficial/query/compare/v3.4.2...v3.4.3) (2023-05-10)


### Bug Fixes

* Query.init() ([c791fb8](https://github.com/umatch-oficial/query/commit/c791fb8eac2efd187fede437f3297c1594483d34))

## [3.4.2](https://github.com/umatch-oficial/query/compare/v3.4.1...v3.4.2) (2023-04-20)


### Bug Fixes

* Query.clear() mutated default values ([a823d5a](https://github.com/umatch-oficial/query/commit/a823d5ac7dfbd23fda83d3b21280d43033b0b1aa))

## [3.4.1](https://github.com/umatch-oficial/query/compare/v3.4.0...v3.4.1) (2023-04-13)


### Bug Fixes

* Query.with() ([3f281f7](https://github.com/umatch-oficial/query/commit/3f281f7b919a02ea5bf1ddff1f0c1115bac67bf4))

## [3.4.0](https://github.com/umatch-oficial/query/compare/v3.3.0...v3.4.0) (2023-04-12)


### Features

* add Query.clear() ([b99219a](https://github.com/umatch-oficial/query/commit/b99219a92a9483436416b5b457a5df8149fd568b))


### Bug Fixes

* refactor Query.clone() to copy all enumerable properties ([10de94e](https://github.com/umatch-oficial/query/commit/10de94e087ce232d19005bcfad0c9a2e68184847))

## [3.3.0](https://github.com/umatch-oficial/query/compare/v3.2.1...v3.3.0) (2023-04-11)


### Features

* add support for WITH clauses ([a6905a4](https://github.com/umatch-oficial/query/commit/a6905a4c2b53affecbcd6077aa7c083c797dec9f))

## [3.2.1](https://github.com/umatch-oficial/query/compare/v3.2.0...v3.2.1) (2023-04-06)


### Bug Fixes

* **types:** fix typing of Query.init ([d804449](https://github.com/umatch-oficial/query/commit/d804449b3eeb1627206361da2c3fa01a6f858cfd))

## [3.2.0](https://github.com/umatch-oficial/query/compare/v3.1.0...v3.2.0) (2023-03-24)


### Features

* allow joinRaw to receive an array ([33df833](https://github.com/umatch-oficial/query/commit/33df833c99a2c65916a2f9f308b3244fdc00989f))
* **formatting:** add line breaks at the start and end of subqueries ([c73e7c9](https://github.com/umatch-oficial/query/commit/c73e7c96b25cb22fb0b001928807e08922e9488a))


### Bug Fixes

* remove white space before first join ([424a724](https://github.com/umatch-oficial/query/commit/424a7246a8cad2a2c840803eba054cc6a4a0a70c))

## [3.1.0](https://github.com/umatch-oficial/query/compare/v3.0.1...v3.1.0) (2023-03-23)


### Features

* change separator from "," to ", " when joining arrays in toSQLValue() ([64ef84e](https://github.com/umatch-oficial/query/commit/64ef84e7590194e1d5f7292d9c0c85b42b438c2e))


### Bug Fixes

* publish src directory ([4b4ddfd](https://github.com/umatch-oficial/query/commit/4b4ddfdbab0b365df006e5020b7d7df4a401ed0e))

## [3.0.1](https://github.com/umatch-oficial/query/compare/v3.0.0...v3.0.1) (2023-03-22)


### Bug Fixes

* **deps:** move commit-and-tag-version to devDependencies ([d932587](https://github.com/umatch-oficial/query/commit/d93258762c20f5fc3a9cca8e8fa047633df04fea))
* **types:** mark first parameter of Query.clone() as optional ([5de364f](https://github.com/umatch-oficial/query/commit/5de364f2bfc5b9003c2c758fd9db84c285ecd72d))

## [3.0.0](https://github.com/umatch-oficial/query/compare/v2.2.2...v3.0.0) (2023-03-21)


### ⚠ BREAKING CHANGES

* Query.where() no longer accepts an array of arguments

### Bug Fixes

* _join() now correctly adds an alias ([7b1e3da](https://github.com/umatch-oficial/query/commit/7b1e3dab48744b349901431a1085d5d4051821ae))
* import unused type in JSDoc ([4e37449](https://github.com/umatch-oficial/query/commit/4e37449d5dc4e286e968a5e4a4c97d7c69a1c79c))
* revert 80ac17a ([3631d1d](https://github.com/umatch-oficial/query/commit/3631d1d7ed437bf77bd504116b1b49268bfa9c5f))

## [2.2.2](https://github.com/umatch-oficial/query/compare/v2.2.1...v2.2.2) (2023-03-21)


### Bug Fixes

* allow { from: Query } in constructor ([5ee6695](https://github.com/umatch-oficial/query/commit/5ee66952d17e48d22732b15baa703c813484a908))

## [2.2.1](https://github.com/umatch-oficial/query/compare/v2.2.0...v2.2.1) (2023-03-21)


### Bug Fixes

* allow array of conditions in where() ([2b50f35](https://github.com/umatch-oficial/query/commit/2b50f356e6bcbc5be698a1daa733c1a272114759))

## [2.2.0](https://github.com/umatch-oficial/query/compare/v2.1.1...v2.2.0) (2023-03-20)


### Features

* add RawValue ([f4c104a](https://github.com/umatch-oficial/query/commit/f4c104a1f4f7c4ebe7d4634d18e1965de062ab7d))

## [2.1.1](https://github.com/umatch-oficial/query/compare/v2.1.0...v2.1.1) (2023-03-20)


### Bug Fixes

* fix getTableAndAlias ([2b14698](https://github.com/umatch-oficial/query/commit/2b14698d861d4a6c185bd7709ee99a29e3fdfcbd))

## [2.1.0](https://github.com/umatch-oficial/query/compare/v2.0.4...v2.1.0) (2023-03-11)


### Features

* add Query.getTableAndAlias() ([f6e0f50](https://github.com/umatch-oficial/query/commit/f6e0f5096c7ad0d9250c3e5722cd4b68fd7493d1))

## [2.0.4](https://github.com/umatch-oficial/query/compare/v2.0.3...v2.0.4) (2023-03-11)

## [2.0.3](https://github.com/umatch-oficial/query/compare/v2.0.2...v2.0.3) (2023-03-10)

## [2.0.2](https://github.com/umatch-oficial/query/compare/v2.0.1...v2.0.2) (2023-03-10)

## [2.0.1](https://github.com/umatch-oficial/query/compare/v2.0.0...v2.0.1) (2023-03-10)


### Bug Fixes

* entryToString and toArray unsafely assumed primitive values ([723ca4a](https://github.com/umatch-oficial/query/commit/723ca4ad0dd08717e71d4fbdefbcd002f02cfb9d))
* remove uses of QueryAs ([7239df1](https://github.com/umatch-oficial/query/commit/7239df14cfa65e8298411d6c0ffec41c21c3b838))

## [2.0.0](https://github.com/umatch-oficial/query/compare/v1.0.0...v2.0.0) (2023-03-10)


### ⚠ BREAKING CHANGES

* QueryAs type and object no longer exist. No longer accepts subqueries in the 'joinRaw' method.

* subqueries ([39fec6a](https://github.com/umatch-oficial/query/commit/39fec6a5802cfa0a44917b97de0f0f0fd1012a58))

## [1.0.0](https://github.com/umatch-oficial/query/compare/51464c705d3064806f6fb836da17ef76a09a6f9f...v1.0.0) (2023-03-09)


### Features

* initial commit ([51464c7](https://github.com/umatch-oficial/query/commit/51464c705d3064806f6fb836da17ef76a09a6f9f))
* port existing code ([5051bf6](https://github.com/umatch-oficial/query/commit/5051bf66a32298c02509a63766deb28773894967))
