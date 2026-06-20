#include <cassert>
#include <chrono>
#include <cstdlib>
#include <iostream>
#include <stdexcept>
#include <string>

#include <axtp_sdk.hpp>

namespace {

std::string envOrDefault(const char* name, const char* fallback) {
    const auto* value = std::getenv(name);
    return value != nullptr && *value != '\0' ? std::string(value) : std::string(fallback);
}

std::uint16_t envPort() {
    const auto text = envOrDefault("AXTP_MOCK_TCP_PORT", "50362");
    const auto parsed = std::stoi(text);
    if (parsed <= 0 || parsed > 65535) {
        throw std::runtime_error("AXTP_MOCK_TCP_PORT out of range");
    }
    return static_cast<std::uint16_t>(parsed);
}

}  // namespace

int main() {
    axtp::sdk::ClientOptions clientOptions;
    clientOptions.connectTimeout = std::chrono::milliseconds(1000);
    clientOptions.requestTimeout = std::chrono::milliseconds(1000);

    axtp::sdk::AxtpClient client(clientOptions);
    client.connect(axtp::sdk::TcpEndpoint{envOrDefault("AXTP_MOCK_TCP_HOST", "127.0.0.1"),
                                          envPort()});
    if (!client.isConnected()) {
        std::cerr << "connect failed: " << client.lastError().message << '\n';
        return 1;
    }

    axtp::sdk::AppReadyOptions appReadyOptions;
    appReadyOptions.timeout = std::chrono::milliseconds(1000);
    appReadyOptions.randomSeed = 0x13572468;
    const auto ready = client.ensureAppReady(appReadyOptions);
    if (!ready.ok) {
        std::cerr << "app-ready failed at " << ready.stage << " code "
                  << static_cast<unsigned>(ready.statusCode) << '\n';
        return 1;
    }
    assert(!client.sessionSid().empty());

    axtp::sdk::CallOptions callOptions;
    callOptions.timeout = std::chrono::milliseconds(1000);
    const auto response = client.callJson("audio.getAlgorithmConfig", "{}", callOptions);
    if (response.find("noiseSuppression") == std::string::npos) {
        std::cerr << "unexpected response: " << response << '\n';
        return 1;
    }

    std::cout << response << '\n';
    return 0;
}
