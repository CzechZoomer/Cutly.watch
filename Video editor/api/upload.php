<?php
header('Content-Type: application/json');

$targetDir = "../assets/uploads/";
if (!file_exists($targetDir)) {
    mkdir($targetDir, 0777, true);
}

$response = ['success' => false, 'files' => []];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_FILES['files'])) {
    $files = $_FILES['files'];
    $count = count($files['name']);

    for ($i = 0; $i < $count; $i++) {
        $fileName = basename($files['name'][$i]);
        // Sanitize filename
        $fileName = preg_replace("/[^a-zA-Z0-9.]/", "_", $fileName);
        $targetFilePath = $targetDir . uniqid() . '_' . $fileName;
        $fileType = strtolower(pathinfo($targetFilePath, PATHINFO_EXTENSION));

        // Allow certain file formats
        $allowTypes = array('mp4', 'webm', 'mp3', 'wav', 'ogg');
        if (in_array($fileType, $allowTypes)) {
            if (move_uploaded_file($files['tmp_name'][$i], $targetFilePath)) {
                $response['files'][] = [
                    'name' => $files['name'][$i],
                    'path' => $targetFilePath,
                    'type' => $files['type'][$i]
                ];
            }
        }
    }

    if (!empty($response['files'])) {
        $response['success'] = true;
    } else {
        $response['message'] = 'No valid files uploaded.';
    }
} else {
    $response['message'] = 'Invalid request.';
}

echo json_encode($response);
?>