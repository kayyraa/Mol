#version 300 es
precision mediump float;
in vec3 VNormal;
in vec3 VWorldPosition;
in vec3 VLocalPosition;
uniform vec3 UColor;
uniform vec3 ULightPosition;
uniform vec3 UCameraPosition;
uniform sampler2D UTexture;
out vec4 FragColor;
const float PI = 3.14159265359;
void main() {
    vec3 LocalNorm = normalize(VLocalPosition);
    float U = 0.5 - atan(LocalNorm.z, LocalNorm.x) / (2.0 * PI);
    float V = 0.5 - asin(clamp(LocalNorm.y, -1.0, 1.0)) / PI;
    vec4 TexColor = texture(UTexture, vec2(U, V));
    vec3 Normal = normalize(VNormal);
    vec3 LightDirection = normalize(ULightPosition - VWorldPosition);
    vec3 ViewDirection = normalize(UCameraPosition - VWorldPosition);
    vec3 HalfVector = normalize(LightDirection + ViewDirection);
    float NdotL = max(dot(Normal, LightDirection), 0.0);
    float Diffuse;
    if (NdotL > 0.8) Diffuse = 1.0;
    else if (NdotL > 0.4) Diffuse = 0.6;
    else if (NdotL > 0.15) Diffuse = 0.35;
    else Diffuse = 0.15;
    float NdotH = max(dot(Normal, HalfVector), 0.0);
    float SpecularStrength = pow(NdotH, 32.0);
    float Specular = step(0.5, SpecularStrength) * 0.6;
    float Edge = dot(ViewDirection, Normal);
    float Silhouette = step(0.25, Edge);
    vec3 BaseColor = mix(UColor, TexColor.rgb, TexColor.a);
    vec3 FinalColor = (BaseColor * Diffuse + vec3(1.0) * Specular) * Silhouette;
    FragColor = vec4(FinalColor, 1.0);
}