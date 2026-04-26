if(NOT TARGET shopify_react-native-skia::rnskia)
add_library(shopify_react-native-skia::rnskia SHARED IMPORTED)
set_target_properties(shopify_react-native-skia::rnskia PROPERTIES
    IMPORTED_LOCATION "/root/idea-turbo/anima-rn/node_modules/@shopify/react-native-skia/android/build/intermediates/cxx/Debug/jo4r1t2o/obj/arm64-v8a/librnskia.so"
    INTERFACE_INCLUDE_DIRECTORIES "/root/idea-turbo/anima-rn/node_modules/@shopify/react-native-skia/android/build/headers/rnskia"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

