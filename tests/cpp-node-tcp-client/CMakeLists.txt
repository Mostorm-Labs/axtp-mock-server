cmake_minimum_required(VERSION 3.16)

project(axtp_cpp_node_tcp_client_smoke LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(AXTP_CPP_RUNTIME_DIR "${CMAKE_CURRENT_LIST_DIR}/../../../axtp-cpp-runtime" CACHE PATH "Path to axtp-cpp-runtime")

if(NOT TARGET axtp::sdk)
  add_subdirectory("${AXTP_CPP_RUNTIME_DIR}" "${CMAKE_BINARY_DIR}/axtp-cpp-runtime")
endif()

add_executable(axtp_cpp_node_tcp_client_smoke main.cpp)
target_link_libraries(axtp_cpp_node_tcp_client_smoke PRIVATE axtp::sdk)
