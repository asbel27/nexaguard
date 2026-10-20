using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace NexaGuardSocialAutoPoster
{
    static class Program
    {
        private static Process nodeProcess = null;
        private static NotifyIcon trayIcon = null;
        private static string appUrl = "http://127.0.0.1:4242";
        private static string baseDir = "";
        private static string logFile = "";

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            baseDir = AppDomain.CurrentDomain.BaseDirectory;
            logFile = Path.Combine(baseDir, "launcher_node.log");
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

            // 1. Si el servidor YA está corriendo en el puerto 4242, simplemente abrir la ventana de la app
            if (IsServerResponding(appUrl + "/api/status", 1200))
            {
                OpenAppWindow(appUrl);
                return;
            }

            // 2. Buscar ejecutable de Node.js
            string nodePath = FindNodeExecutable();
            if (string.IsNullOrEmpty(nodePath))
            {
                DialogResult res = MessageBox.Show(
                    "NexaGuard requiere Node.js instalado para ejecutar la automatizacion de publicaciones y respuestas con IA.\n\n¿Deseas abrir la pagina oficial para descargarlo ahora?",
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

            // 3. Iniciar servidor Node.js en segundo plano (oculto)
            try
            {
                ProcessStartInfo nodePsi = new ProcessStartInfo
                {
                    FileName = nodePath,
                    Arguments = "\"" + serverScript + "\"",
                    WorkingDirectory = baseDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                nodeProcess = new Process { StartInfo = nodePsi };

                // Limpiar o inicializar archivo de log
                try
                {
                    File.WriteAllText(logFile, string.Format("[{0}] Iniciando NexaGuard Engine...\r\n", DateTime.Now));
                }
                catch { }

                nodeProcess.OutputDataReceived += (s, e) =>
                {
                    if (!string.IsNullOrEmpty(e.Data))
                    {
                        try { File.AppendAllText(logFile, "[OUT] " + e.Data + "\r\n"); } catch { }
                    }
                };

                nodeProcess.ErrorDataReceived += (s, e) =>
                {
                    if (!string.IsNullOrEmpty(e.Data))
                    {
                        try { File.AppendAllText(logFile, "[ERR] " + e.Data + "\r\n"); } catch { }
                    }
                };

                nodeProcess.Start();
                nodeProcess.BeginOutputReadLine();
                nodeProcess.BeginErrorReadLine();
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

            // 4. Esperar hasta que el servidor responda HTTP 200 en /api/status (hasta 25 segundos)
            bool isUp = false;
            for (int i = 0; i < 50; i++)
            {
                Thread.Sleep(500);

                if (nodeProcess.HasExited)
                {
                    string errContent = "";
                    try { if (File.Exists(logFile)) errContent = File.ReadAllText(logFile); } catch { }
                    if (errContent.Length > 800) errContent = errContent.Substring(errContent.Length - 800);
                    MessageBox.Show(
                        "El motor de Node.js se detuvo inesperadamente al iniciar.\r\n\r\nDetalles del log:\r\n" + errContent,
                        "NexaGuard - Error de Inicio",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                if (IsServerResponding(appUrl + "/api/status", 800))
                {
                    isUp = true;
                    break;
                }
            }

            if (!isUp)
            {
                MessageBox.Show(
                    "El servidor no respondio en el tiempo esperado (puerto 4242).\nRevisa el archivo launcher_node.log.",
                    "NexaGuard - Tiempo de Espera Agotado",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
            }

            // 5. Configurar Icono en la Bandeja del Sistema (System Tray Icon)
            SetupTrayIcon();

            // 6. Abrir ventana de la aplicación nativa en Chrome o Edge
            OpenAppWindow(appUrl);

            // 7. Loop de Windows Forms para mantener el Tray Icon activo sin consumir CPU
            Application.Run();
        }

        static void SetupTrayIcon()
        {
            try
            {
                trayIcon = new NotifyIcon();

                // Cargar app_icon.ico si existe en el directorio, o extraer el del propio ejecutable
                string icoPath = Path.Combine(baseDir, "app_icon.ico");
                if (File.Exists(icoPath))
                {
                    try { trayIcon.Icon = new Icon(icoPath); }
                    catch { trayIcon.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); }
                }
                else
                {
                    try { trayIcon.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); }
                    catch { trayIcon.Icon = SystemIcons.Application; }
                }

                trayIcon.Text = "NexaGuard Social AutoPoster";
                trayIcon.Visible = true;

                // Menú contextual al hacer clic derecho en el icono
                ContextMenuStrip menu = new ContextMenuStrip();

                ToolStripMenuItem itemTitle = new ToolStripMenuItem("🛡️ NexaGuard Social AutoPoster");
                itemTitle.Enabled = false;
                menu.Items.Add(itemTitle);
                menu.Items.Add(new ToolStripSeparator());

                ToolStripMenuItem itemOpen = new ToolStripMenuItem("🚀 Abrir Panel de Control");
                itemOpen.Font = new Font(itemOpen.Font, FontStyle.Bold);
                itemOpen.Click += (s, e) => OpenAppWindow(appUrl);
                menu.Items.Add(itemOpen);

                ToolStripMenuItem itemLogs = new ToolStripMenuItem("📋 Ver Logs del Motor");
                itemLogs.Click += (s, e) =>
                {
                    try
                    {
                        if (File.Exists(logFile)) Process.Start("notepad.exe", logFile);
                        else MessageBox.Show("Aun no hay logs registrados.", "NexaGuard Logs");
                    }
                    catch { }
                };
                menu.Items.Add(itemLogs);

                menu.Items.Add(new ToolStripSeparator());

                ToolStripMenuItem itemExit = new ToolStripMenuItem("🛑 Detener y Salir");
                itemExit.Click += (s, e) => ShutdownApp();
                menu.Items.Add(itemExit);

                trayIcon.ContextMenuStrip = menu;

                // Doble clic o clic en el icono abre el panel
                trayIcon.DoubleClick += (s, e) => OpenAppWindow(appUrl);
                trayIcon.Click += (s, e) =>
                {
                    MouseEventArgs me = e as MouseEventArgs;
                    if (me != null && me.Button == MouseButtons.Left)
                    {
                        OpenAppWindow(appUrl);
                    }
                };

                // Notificación emergente
                trayIcon.ShowBalloonTip(
                    3000,
                    "NexaGuard Social AutoPoster Activo",
                    "El bot y servidor de automatización están listos. Haz doble clic aquí para abrir el panel de control.",
                    ToolTipIcon.Info
                );
            }
            catch { }
        }

        static void ShutdownApp()
        {
            try
            {
                if (trayIcon != null)
                {
                    trayIcon.Visible = false;
                    trayIcon.Dispose();
                }
            }
            catch { }

            // Enviar petición de apagado limpio al servidor si responde
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(appUrl + "/api/system/shutdown");
                req.Method = "POST";
                req.Timeout = 1000;
                req.ContentLength = 0;
                using (HttpWebResponse res = (HttpWebResponse)req.GetResponse()) { }
            }
            catch { }

            // Terminar proceso Node si sigue activo
            try
            {
                if (nodeProcess != null && !nodeProcess.HasExited)
                {
                    nodeProcess.Kill();
                }
            }
            catch { }

            Application.Exit();
        }

        static void OpenAppWindow(string url)
        {
            string chromePath = FindChrome();
            string profileDir = Path.Combine(baseDir, "chrome_app_ui");

            try
            {
                if (!string.IsNullOrEmpty(chromePath))
                {
                    ProcessStartInfo chromePsi = new ProcessStartInfo
                    {
                        FileName = chromePath,
                        Arguments = string.Format("--app=\"{0}\" --window-size=1360,880 --user-data-dir=\"{1}\" --no-first-run --no-default-browser-check", url, profileDir),
                        UseShellExecute = false
                    };
                    Process.Start(chromePsi);
                }
                else
                {
                    Process.Start(url);
                }
            }
            catch
            {
                try { Process.Start(url); } catch { }
            }
        }

        static bool IsServerResponding(string url, int timeoutMs)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                req.Timeout = timeoutMs;
                req.Method = "GET";
                using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                {
                    return res.StatusCode == HttpStatusCode.OK;
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
