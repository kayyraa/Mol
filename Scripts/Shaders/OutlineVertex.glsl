#version 300 es
in vec3 APosition;
uniform mat4 UModel;
uniform mat4 UView;
uniform mat4 UProjection;
uniform float UOutlineScale;
void main() {
    vec4 ScaledPosition = vec4(APosition * UOutlineScale, 1.0);
    gl_Position = UProjection * UView * UModel * ScaledPosition;
}