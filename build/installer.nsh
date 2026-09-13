!macro customInstall
  IfFileExists "$INSTDIR\${APP_EXECUTABLE_FILENAME}" moneypot_executable_ready 0
    MessageBox MB_OK|MB_ICONSTOP "MoneyPot was not fully installed because Windows could not write ${APP_EXECUTABLE_FILENAME}.$\r$\n$\r$\nClose every running MoneyPot window and run this installer again.$\r$\n$\r$\nInstallation folder: $INSTDIR"
    Abort

  moneypot_executable_ready:
  IfFileExists "$INSTDIR\ffmpeg.dll" moneypot_runtime_ready 0
    MessageBox MB_OK|MB_ICONSTOP "MoneyPot was not fully installed because its Electron runtime files could not be written.$\r$\n$\r$\nClose every running MoneyPot window and run this installer again.$\r$\n$\r$\nInstallation folder: $INSTDIR"
    Abort

  moneypot_runtime_ready:
  IfFileExists "$INSTDIR\resources\app\package.json" moneypot_application_ready 0
    MessageBox MB_OK|MB_ICONSTOP "MoneyPot was not fully installed because its application files could not be written.$\r$\n$\r$\nRun this installer again.$\r$\n$\r$\nInstallation folder: $INSTDIR"
    Abort

  moneypot_application_ready:
!macroend
