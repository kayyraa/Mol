#version 300 es
in vec3 APosition;
in vec3 ANormal;
uniform mat4 UModel;
uniform mat4 UView;
uniform mat4 UProjection;
uniform float UOutlineScale;
out vec3 VNormal;
out vec3 VWorldPosition;
out vec3 VLocalPosition;
void main() {
    float S = max(UOutlineScale, 0.001);
    vec3 Pos = APosition * S;
    VLocalPosition = APosition;
    vec4 WorldPosition = UModel * vec4(Pos, 1.0);
    VWorldPosition = WorldPosition.xyz;
    VNormal = mat3(UModel) * ANormal;
    gl_Position = UProjection * UView * WorldPosition;
}