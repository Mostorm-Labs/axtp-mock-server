# Generated AXTP C++ Mock Server

This generated project uses `axtp-cpp-runtime` from a sibling repository.

```bash
cmake -S . -B build
cmake --build build
ctest --test-dir build --output-on-failure
```

Override the runtime location with `-DAXTP_CPP_RUNTIME_DIR=/path/to/axtp-cpp-runtime`.
