#version 300 es
precision mediump float;
in vec3 VNormal;
in vec3 VWorldPosition;
in vec3 VLocalPosition;
uniform vec3 UColor;
uniform vec3 ULightPosition;
uniform vec3 UCameraPosition;
uniform sampler2D UTexture;
uniform float UOutlineMode;
uniform vec4 UOutlineColor;
out vec4 FragColor;
const float PI = 3.14159265359;

void main() {
    // Solid outline / particle pass
    if (UOutlineMode > 0.5) {
        FragColor = UOutlineColor;
        return;
    }

    vec3 Normal = normalize(VNormal);
    vec3 Local = normalize(VLocalPosition);
    vec3 ViewDirection = normalize(UCameraPosition - VWorldPosition);
    vec3 LightDirection = normalize(ULightPosition - VWorldPosition);

    float U = 0.5 - atan(Local.z, Local.x) / (2.0 * PI);
    float V = 0.5 - asin(clamp(Local.y, -1.0, 1.0)) / PI;
    vec4 TexColor = texture(UTexture, vec2(U, V));

    float Wrap = 0.4;
    float NdotL = max(dot(Normal, LightDirection) + Wrap, 0.0) / (1.0 + Wrap);
    float Diffuse = 0.58 + 0.42 * NdotL;
    float Spec = pow(max(dot(Normal, normalize(LightDirection + ViewDirection)), 0.0), 56.0) * 0.14;
    float Facing = max(dot(Normal, ViewDirection), 0.0);
    float Rim = pow(1.0 - Facing, 2.2) * 0.14;

    vec3 BaseColor = mix(UColor, TexColor.rgb, TexColor.a * 0.92);
    vec3 FinalColor = BaseColor * Diffuse + vec3(Spec);
    FinalColor *= (1.0 - Rim);

    FragColor = vec4(FinalColor, 1.0);
}