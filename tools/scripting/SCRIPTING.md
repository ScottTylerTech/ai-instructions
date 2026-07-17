Rules to follow when writing shell scripts:
When testing, never hide the output.  Do not pipe it to a hidden feed that I can't see.
On rare exceptions when the output is so large that it can't fit in the shell window, you can send it to file.  Open the file when you do this so I can see it.
Avoid using environment variables as switches.  use actual input flags (--flag).
