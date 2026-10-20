using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

namespace NexaGuardSocialAutoPoster
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string serverScript = Path.Combine(baseDir, "server.js");

            if (!File.Exists(serverScript))
            {
                MessageBox.Show(
                    "No se encontro el archivo server.js en el directorio:\n" + baseDir,
                    "NexaGuard Social AutoPoster - Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // 1. Buscar ejecutable de Node.js
            string nodePath = FindNodeExecutable();
            if (string.IsNullOrEmpty(nodePath))
            {
                DialogResult res = MessageBox.Show(
                    "NexaGuard requiere Node.js instalado para ejecutar la automatizacion.\n\n¿Deseas abrir la pagina oficial para descargarlo ahora?",
                    "Node.js no encontrado",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Warning
                );
                if (res == DialogResult.Yes)
                {
                    Process.Start("https://nodejs.org/");
                }
                return;
            }

            // 2. Iniciar servidor Node.js en segundo plano (oculto)
            Process nodeProcess = null;
            try
            {
                ProcessStartInfo nodePsi = new ProcessStartInfo
                {
                    FileName = nodePath,
                    Arguments = "\"" + serverScript + "\"",
                    WorkingDirectory = baseDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                nodeProcess = Process.Start(nodePsi);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Error al iniciar el servidor de automatizacion:\n" + ex.Message,
                    "NexaGuard Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // 3. Esperar a que el puerto 4242 este escuchando
            string appUrl = "http://127.0.0.1:4242";
            bool isUp = false;
            for (int i = 0; i < 30; i++)
            {
                Thread.Sleep(300);
                if (IsPortOpen("127.0.0.1", 4242))
                {
                    isUp = true;
                    break;
                }
            }

            // 4. Buscar Google Chrome para modo Ventana de Aplicacion Nativa (--app)
            string chromePath = FindChrome();
            Process browserProcess = null;

            try
            {
                if (!string.IsNullOrEmpty(chromePath))
                {
                    ProcessStartInfo chromePsi = new ProcessStartInfo
                    {
                        FileName = chromePath,
                        Arguments = "--app=\"" + appUrl + "\" --window-size=1360,880",
                        UseShellExecute = false
                    };
                    browserProcess = Process.Start(chromePsi);
                }
                else
                {
                    // Si no tiene Chrome, abrir en el navegador por defecto
                    Process.Start(appUrl);
                }
            }
            catch
            {
                Process.Start(appUrl);
            }

            // 5. Si abrimos ventana de Chrome, esperar a que el usuario la cierre para limpiar el proceso de Node
            if (browserProcess != null)
            {
                try
                {
                    browserProcess.WaitForExit();
                }
                catch { }

                // Al cerrar la ventana, terminar el proceso Node.js en segundo plano
                try
                {
                    if (nodeProcess != null && !nodeProcess.HasExited)
                    {
                        nodeProcess.Kill();
                    }
                }
                catch { }
            }
        }

        static bool IsPortOpen(string host, int port)
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    IAsyncResult result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(300);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        static string FindNodeExecutable()
        {
            string[] possiblePaths = new string[]
            {
                @"C:\Program Files\nodejs\node.exe",
                @"C:\Program Files (x86)\nodejs\node.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\nodejs\node.exe")
            };

            foreach (string p in possiblePaths)
            {
                if (File.Exists(p)) return p;
            }

            // Buscar en PATH
            try
            {
                string pathEnv = Environment.GetEnvironmentVariable("PATH");
                if (pathEnv != null)
                {
                    foreach (string dir in pathEnv.Split(';'))
                    {
                        string test = Path.Combine(dir.Trim(), "node.exe");
                        if (File.Exists(test)) return test;
                    }
                }
            }
            catch { }

            return null;
        }

        static string FindChrome()
        {
            string[] possiblePaths = new string[]
            {
                @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe"),
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
            };

            foreach (string p in possiblePaths)
            {
                if (File.Exists(p)) return p;
            }
            return null;
        }
    }
}

