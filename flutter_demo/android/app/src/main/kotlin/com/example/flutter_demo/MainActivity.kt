package com.example.flutter_demo

import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        try {
            // Workaround for Vulkan driver crashes on some Android devices.
            // Per llamadart docs, disabling cooperative matrix probing avoids
            // the kernel panic / SIGSEGV on Adreno/Mali drivers with buggy
            // fp16 / int8 coopmat support.
            System.setProperty("GGML_VK_DISABLE_COOPMAT", "1")
            System.setProperty("GGML_VK_DISABLE_COOPMAT2", "1")
        } catch (_: Throwable) {
            // Best effort — fallback to llama.cpp's default behavior.
        }
        super.onCreate(savedInstanceState)
    }
}
