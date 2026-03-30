# TCP Proxy for Sitecore CM — replaces broken netsh portproxy on Windows 11
# Usage: powershell -File tcp-proxy.ps1
# Forwards localhost:443 → Traefik container IP:443

param(
    [int]$ListenPort = 443,
    [int]$ConnectPort = 443
)

# Get Traefik container IP dynamically
$traefikIp = docker inspect xmcloud-starter-js-traefik-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
if (-not $traefikIp) {
    Write-Host "ERROR: Could not get Traefik container IP. Is Docker running?"
    exit 1
}

Write-Host "TCP Proxy: 127.0.0.1:$ListenPort -> ${traefikIp}:$ConnectPort"
Write-Host "Press Ctrl+C to stop"

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $ListenPort)
$listener.Start()
Write-Host "Listening on 127.0.0.1:$ListenPort..."

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $remoteEndpoint = $client.Client.RemoteEndPoint

        # Connect to Traefik
        $target = [System.Net.Sockets.TcpClient]::new()
        try {
            $target.Connect($traefikIp, $ConnectPort)
        } catch {
            Write-Host "  Failed to connect to ${traefikIp}:${ConnectPort}: $_"
            $client.Close()
            continue
        }

        # Bidirectional stream copy in background jobs
        $clientStream = $client.GetStream()
        $targetStream = $target.GetStream()

        $job1 = [System.Threading.Tasks.Task]::Run([Action]{
            try { $clientStream.CopyTo($targetStream) } catch {} finally { try { $targetStream.Close() } catch {} }
        })
        $job2 = [System.Threading.Tasks.Task]::Run([Action]{
            try { $targetStream.CopyTo($clientStream) } catch {} finally { try { $clientStream.Close() } catch {} }
        })
    }
} finally {
    $listener.Stop()
    Write-Host "Proxy stopped."
}
