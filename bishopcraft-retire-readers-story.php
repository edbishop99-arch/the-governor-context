<?php
/**
 * Plugin Name: Bishopcraft Retire READERS Story
 * Description: Removes the retired READERS Story edition from The Governor reader and disables its download endpoint.
 * Version: 1.0.0
 * Author: Bishopcraft
 */

if (!defined('ABSPATH')) {
    exit;
}

function bishopcraft_retire_story_download() {
    if (!headers_sent()) {
        status_header(410);
        nocache_headers();
        header('Content-Type: text/plain; charset=UTF-8');
    }
    echo "The READERS Story edition is no longer available.";
    exit;
}
add_action('wp_ajax_governor_story_download', 'bishopcraft_retire_story_download', -9999);
add_action('wp_ajax_nopriv_governor_story_download', 'bishopcraft_retire_story_download', -9999);

function bishopcraft_retire_story_shortcode($output, $tag) {
    if ($tag !== 'governor_reader' || !is_string($output)) {
        return $output;
    }

    $filtered = preg_replace(
        '~<p\b[^>]*>\s*<a\b[^>]*\bclass=(["\x27])[^"\x27]*\bgovernor-story-download\b[^"\x27]*\1[^>]*>.*?</a>\s*</p>~is',
        '',
        $output
    );

    return $filtered === null ? $output : $filtered;
}
add_filter('do_shortcode_tag', 'bishopcraft_retire_story_shortcode', 100, 2);

function bishopcraft_retire_story_filter_frame($html) {
    if (!is_string($html) || $html === '' || strpos($html, 'bishopcraft-retire-story-runtime') !== false) {
        return $html;
    }

    $nonce = '';
    if (preg_match('~<script\b[^>]*\bnonce=(["\x27])([^"\x27]+)\1~i', $html, $m)) {
        $nonce = ' nonce="' . esc_attr($m[2]) . '"';
    }

    $src = plugins_url('retire-story.js', __FILE__);
    $tag = '<script id="bishopcraft-retire-story-runtime"' . $nonce . ' src="' . esc_url($src) . '" defer></script>';

    $pos = stripos($html, '</head>');
    if ($pos === false) {
        $pos = stripos($html, '</body>');
    }
    if ($pos === false) {
        return $html . $tag;
    }

    if (!headers_sent()) {
        header_remove('Content-Length');
    }

    return substr($html, 0, $pos) . $tag . substr($html, $pos);
}

function bishopcraft_retire_story_buffer_start() {
    ob_start('bishopcraft_retire_story_filter_frame');
}
add_action('wp_ajax_governor_private_frame', 'bishopcraft_retire_story_buffer_start', -9999);
add_action('wp_ajax_nopriv_governor_private_frame', 'bishopcraft_retire_story_buffer_start', -9999);
