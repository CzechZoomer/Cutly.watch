<?php
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if ($data) {
    $projectsDir = "../projects/";
    if (!file_exists($projectsDir)) {
        mkdir($projectsDir, 0777, true);
    }

    $projectId = $data['id'] ?? uniqid();
    $filename = $projectsDir . $projectId . '.json';

    if (file_put_contents($filename, json_encode($data, JSON_PRETTY_PRINT))) {
        echo json_encode(['success' => true, 'id' => $projectId, 'message' => 'Project saved successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to write project file']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid data']);
}
?>