$here=Split-Path -Parent $MyInvocation.MyCommand.Path
Add-Type -AssemblyName System.Speech
$lines=Get-Content (Join-Path $here 'lines.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$dir=Join-Path $here 'clips'; New-Item -ItemType Directory -Force $dir | Out-Null
$fmt=New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000,[System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,[System.Speech.AudioFormat.AudioChannel]::Mono)
foreach($l in $lines){
  $s=New-Object System.Speech.Synthesis.SpeechSynthesizer
  $s.SelectVoice('Microsoft Zira Desktop');$s.Rate=0;$s.Volume=100
  $s.SetOutputToWaveFile((Join-Path $dir $l.file),$fmt)
  $s.Speak($l.speak);$s.Dispose()
}
"generated $($lines.Count)"
