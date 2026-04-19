<?php
// LinkChannel — Dynamic OG tag injection
// Nginx serves this file before index.html (index directive priority)
error_reporting(0);

$title = 'My Portfolio';
try {
  $raw = file_get_contents(__DIR__ . '/data/apps.json');
  if ($raw !== false) {
    $data = json_decode($raw, true);
    if (isset($data['settings']['title']) && $data['settings']['title'] !== '') {
      $title = htmlspecialchars($data['settings']['title'], ENT_QUOTES, 'UTF-8');
    }
  }
} catch (\Throwable $e) {
  // fallback to default title
}

$html = file_get_contents(__DIR__ . '/index.html');
if ($html === false) {
  // index.html unreadable — last resort
  header('Content-Type: text/html; charset=utf-8');
  echo '<!DOCTYPE html><html><head><title>' . $title . '</title></head><body><script>location.reload();</script></body></html>';
  exit;
}

$og = '<meta property="og:title" content="' . $title . '">' . "\n" .
      '  <meta property="og:description" content="Vibe Coder 作品集">' . "\n" .
      '  <meta property="og:image" content="https://YOUR_DOMAIN/uploads/og-preview.png">' . "\n" .
      '  <meta property="og:url" content="https://YOUR_DOMAIN/">' . "\n" .
      '  <meta property="og:type" content="website">';

$result = str_replace('<meta name="og-title-placeholder">', $og, $html);

header('Content-Type: text/html; charset=utf-8');
echo ($result !== false ? $result : $html);
