// -*- glsl -*-
#version 100

#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif

uniform mat4 view_matrix;
uniform mat4 world_matrix;
uniform vec4 mult_color;
uniform vec4 add_color;
uniform mat3 u_matrix;

uniform int u_gradient_type;
uniform sampler2D u_texture;
uniform int u_repeat_mode;
uniform float u_focal_point;
uniform int u_interpolation;

varying vec2 frag_uv;

vec4 linear_to_srgb(vec4 linear) {
    vec3 rgb = linear.rgb;
    if (linear.a > 0.0) {
        rgb = rgb / linear.a;
    }
    vec3 a = 12.92 * rgb;
    vec3 b = 1.055 * pow(rgb, vec3(1.0 / 2.4)) - 0.055;
    vec3 c = step(vec3(0.0031308), rgb);
    return vec4(mix(a, b, c) * linear.a, linear.a);
}

float find_t(vec2 uv) {
    if (u_gradient_type == 0) {
        // linear
        return uv.x;
    } else if (u_gradient_type == 1) {
        // radial
        return length(frag_uv * 2.0 - 1.0);
    } else if (u_gradient_type == 2) {
        // focal
        vec2 uv = frag_uv * 2.0 - 1.0;
        vec2 d = vec2(u_focal_point, 0.0) - uv;
        float l = length(d);
        d = d / l;
        return l / (sqrt(1.0 - u_focal_point * u_focal_point * d.y * d.y) + u_focal_point * d.x);
    }
}

void main() {
    // Calculate normalized `t` position in gradient, [0.0, 1.0] being the bounds of the ratios.
    float t = find_t(frag_uv);

    if (u_repeat_mode == 0) {
        // Clamp
        t = clamp(t, 0.0, 1.0);
    } else if (u_repeat_mode == 1) {
        // Repeat
        t = fract(t);
    } else {
        // Mirror
        if (t < 0.0) {
            t = -t;
        }
        if (int(mod(t, 2.0)) == 0) {
            t = fract(t);
        } else {
            t = 1.0 - fract(t);
        }
    }

    vec4 color = texture2D(u_texture, vec2(t, 0.0));
    if (u_interpolation != 0) {
        color = linear_to_srgb(color);
    }

    color = clamp(color * mult_color + add_color, 0.0, 1.0);
    float alpha = clamp(color.a, 0.0, 1.0);
    gl_FragColor = vec4(color.rgb * alpha, alpha);
}
