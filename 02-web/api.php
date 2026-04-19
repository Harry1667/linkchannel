<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$dataFile = __DIR__ . '/data/apps.json';

function loadData() {
    global $dataFile;
    if (!file_exists($dataFile)) {
        return ['settings' => ['passwordEnabled' => false, 'password' => '', 'background' => ['type' => 'gradient', 'value' => 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)'], 'darkMode' => true, 'title' => 'My Works'], 'pages' => [['id' => 'page-1', 'items' => []]]];
    }
    return json_decode(file_get_contents($dataFile), true);
}

function saveData($data) {
    global $dataFile;
    $dir = dirname($dataFile);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    return file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

switch ($action) {
    case 'load':
        echo json_encode(loadData());
        break;

    case 'save':
        $body = json_decode(file_get_contents('php://input'), true);
        if (!$body) {
            http_response_code(400);
            echo json_encode(['error' => '資料格式錯誤']);
            break;
        }
        $data = loadData();
        // Check password if enabled
        if ($data['settings']['passwordEnabled'] && !empty($data['settings']['password'])) {
            $sentPassword = $body['_adminPassword'] ?? '';
            if ($sentPassword !== $data['settings']['password']) {
                http_response_code(403);
                echo json_encode(['error' => '密碼錯誤']);
                break;
            }
        }
        unset($body['_adminPassword']);
        if (saveData($body) !== false) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => '儲存失敗，請檢查伺服器權限']);
        }
        break;

    case 'verify-password':
        $body = json_decode(file_get_contents('php://input'), true);
        $data = loadData();
        if (!$data['settings']['passwordEnabled']) {
            echo json_encode(['success' => true]);
            break;
        }
        $entered = $body['password'] ?? '';
        if ($entered === $data['settings']['password']) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(403);
            echo json_encode(['error' => '密碼錯誤']);
        }
        break;

    case 'upload-bg':
        $data = loadData();
        // Password check
        $sentPassword = $_POST['_adminPassword'] ?? '';
        if ($data['settings']['passwordEnabled'] && $sentPassword !== $data['settings']['password']) {
            http_response_code(403);
            echo json_encode(['error' => '密碼錯誤']);
            break;
        }
        if (!isset($_FILES['image'])) {
            http_response_code(400);
            echo json_encode(['error' => '沒有收到圖片']);
            break;
        }
        $file = $_FILES['image'];
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($file['type'], $allowedTypes)) {
            http_response_code(400);
            echo json_encode(['error' => '不支援的圖片格式']);
            break;
        }
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'bg_' . time() . '.' . $ext;
        $uploadDir = __DIR__ . '/uploads/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        if (move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            echo json_encode(['success' => true, 'url' => 'uploads/' . $filename]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => '上傳失敗']);
        }
        break;

    case 'fetch-meta':
        $url = $_GET['url'] ?? '';
        if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
            http_response_code(400);
            echo json_encode(['error' => '無效的 URL']);
            break;
        }
        $ctx = stream_context_create(['http' => [
            'timeout' => 8,
            'header' => "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36\r\n",
            'follow_location' => true,
        ]]);
        $html = @file_get_contents($url, false, $ctx);
        if (!$html) {
            echo json_encode(['title' => '', 'favicon' => '']);
            break;
        }
        // Parse title
        $title = '';
        if (preg_match('/<title[^>]*>(.*?)<\/title>/si', $html, $m)) {
            $title = html_entity_decode(trim(strip_tags($m[1])), ENT_QUOTES, 'UTF-8');
            $title = mb_substr($title, 0, 60);
        }
        // Parse base URL for favicon
        $parsed = parse_url($url);
        $base = $parsed['scheme'] . '://' . $parsed['host'];
        // Try to find favicon link
        $favicon = '';
        if (preg_match('/<link[^>]+rel=["\'](?:shortcut icon|icon)["\'][^>]+href=["\']([^"\']+)["\'][^>]*>/i', $html, $m2)) {
            $fav = $m2[1];
            $favicon = (strpos($fav, 'http') === 0) ? $fav : $base . '/' . ltrim($fav, '/');
        } else {
            $favicon = $base . '/favicon.ico';
        }
        echo json_encode(['title' => $title, 'favicon' => $favicon, 'base' => $base]);
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => '未知的 action']);
}
