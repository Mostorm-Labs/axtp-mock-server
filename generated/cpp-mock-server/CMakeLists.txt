cmake_minimum_required(VERSION 3.16)

project(axtp_generated_cpp_mock_server LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(AXTP_CPP_RUNTIME_DIR "${CMAKE_CURRENT_LIST_DIR}/../../../axtp-cpp-runtime" CACHE PATH "Path to axtp-cpp-runtime")

if(NOT TARGET axtp::sdk)
  add_subdirectory("${AXTP_CPP_RUNTIME_DIR}" "${CMAKE_BINARY_DIR}/axtp-cpp-runtime")
endif()

add_library(axtp_cpp_mock_handlers INTERFACE)
target_include_directories(axtp_cpp_mock_handlers INTERFACE "${CMAKE_CURRENT_LIST_DIR}/include")
target_link_libraries(axtp_cpp_mock_handlers INTERFACE axtp::sdk)

add_executable(axtp_cpp_mock_server src/main.cpp)
target_link_libraries(axtp_cpp_mock_server PRIVATE axtp_cpp_mock_handlers)

enable_testing()
add_executable(axtp_cpp_mock_server_smoke tests/smoke.cpp)
target_link_libraries(axtp_cpp_mock_server_smoke PRIVATE axtp_cpp_mock_handlers)
add_test(NAME axtp_cpp_mock_server_smoke COMMAND axtp_cpp_mock_server_smoke)
