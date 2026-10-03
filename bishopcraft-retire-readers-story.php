<?php
/**
 * Plugin Name: Bishopcraft Retire READERS Story
 * Description: Removes the retired READERS Story edition from The Governor reader and disables its download/data endpoints.
 * Version: 1.1.0
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

function bishopcraft_retire_story_data() {
    $route = isset($_GET['route']) && is_string($_GET['route']) ? wp_unslash($_GET['route']) : '';
    $edition = isset($_GET['edition']) && is_string($_GET['edition']) ? wp_unslash($_GET['edition']) : '';

    if (preg_match('~^/api/readers(?:/|$)~', $route) || ($route === '/api/search' && $edition === 'readers')) {
        wp_send_json_error(array('message' => 'The READERS Story edition is no longer available.'), 410);
    }
}
add_action('wp_ajax_governor_private_data', 'bishopcraft_retire_story_data', -9999);
add_action('wp_ajax_nopriv_governor_private_data', 'bishopcraft_retire_story_data', -9999);

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

    $bootstrap = '<script id="bishopcraft-retire-story-bootstrap">'
        . 'try{localStorage.setItem("governor-reading-mode","voice");'
        . 'if(/view=(?:readers|story)\\b/i.test(location.href)){location.replace(location.href.replace(/view=(?:readers|story)\\b/ig,"view=voice"));}}catch(e){}'
        . '</script>';

    $src = plugins_url('retire-story.js', __FILE__);
    $runtime = '<script id="bishopcraft-retire-story-runtime" src="' . esc_url($src) . '" defer></script>';

    $head = stripos($html, '<head>');
    if ($head !== false) {
        $insert_at = $head + strlen('<head>');
        $html = substr($html, 0, $insert_at) . $bootstrap . substr($html, $insert_at);
    } else {
        $html = $bootstrap . $html;
    }

    $pos = stripos($html, '</head>');
    if ($pos === false) {
        $pos = stripos($html, '</body>');
    }
    if ($pos === false) {
        $html .= $runtime;
    } else {
        $html = substr($html, 0, $pos) . $runtime . substr($html, $pos);
    }

    if (!headers_sent()) {
        header_remove('Content-Length');
    }

    return $html;
}

function bishopcraft_retire_story_buffer_start() {
    ob_start('bishopcraft_retire_story_filter_frame');
}
add_action('wp_ajax_governor_private_frame', 'bishopcraft_retire_story_buffer_start', -9999);
add_action('wp_ajax_nopriv_governor_private_frame', 'bishopcraft_retire_story_buffer_start', -9999);
