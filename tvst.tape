Output tvst.gif

Set Shell bash
Set FontSize 15
Set FontFamily "SF Mono"
Set Width 1000
Set Height 580
Set Padding 24
Set Theme "Catppuccin Mocha"
Set WindowBar Colorful
Set WindowBarSize 36
Set BorderRadius 12
Set TypingSpeed 45ms
Set Framerate 20
Set Margin 0

Env TVST_CONFIG_DIR "/tmp/tvst"
Env TZ "America/New_York"
Env FORCE_COLOR "1"

Hide
Type "clear" Enter
Sleep 300ms
Show

Sleep 700ms
Type `tvst schedule tonight -f 'kitchen nightmares'`
Sleep 500ms
Enter
Sleep 3.5s

Type "tvst next taskmaster"
Sleep 500ms
Enter
Sleep 3.5s

Ctrl+L
Sleep 300ms
Type "tvst fav add taskmaster"
Sleep 500ms
Enter
Sleep 2.5s
Down
Sleep 600ms
Up
Sleep 800ms
Enter
Sleep 2s

Type "tvst fav add slow horses --first"
Sleep 400ms
Enter
Sleep 1.8s

Type "tvst fav add survivor --first"
Sleep 400ms
Enter
Sleep 1.8s

Ctrl+L
Sleep 300ms
Type "tvst fav upcoming --days 30"
Sleep 500ms
Enter
Sleep 6s
