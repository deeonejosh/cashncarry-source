#!/usr/bin/env python3
"""Make staging authentication transitions deterministic without changing auth APIs."""
from pathlib import Path
import sys

p = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('integrated/app/src/main/java/com/example/ui/auth/AuthComponents.kt')
s = p.read_text(encoding='utf-8')
old = '''                        AnimatedContent(
                            targetState = step,
                            transitionSpec = { fadeIn(tween(180)) togetherWith fadeOut(tween(140)) },
                            label = "auth_step_content"
                        ) { activeStep ->
                            when (activeStep) {'''
new = '''                        // Render one active form for predictable auth navigation and accessibility.
                        key(step) {
                            when (step) {'''
if old not in s:
    if new in s:
        print('Auth-step transition already patched')
        sys.exit(0)
    raise SystemExit('Expected AnimatedContent transition not found; review source before patching')
assert s.count(old) == 1, 'Unexpected multiple auth step animations'
s = s.replace(old, new, 1)
s = s.replace('import androidx.compose.animation.AnimatedContent\n', '', 1)
s = s.replace('import androidx.compose.animation.fadeIn\n', '', 1)
s = s.replace('import androidx.compose.animation.fadeOut\n', '', 1)
s = s.replace('import androidx.compose.animation.togetherWith\n', '', 1)
s = s.replace('import androidx.compose.runtime.Composable\n', 'import androidx.compose.runtime.Composable\nimport androidx.compose.runtime.LaunchedEffect\nimport androidx.compose.runtime.key\n', 1)
s = s.replace('import androidx.compose.animation.animateColor\n', 'import androidx.compose.animation.animateColor\nimport androidx.compose.animation.animateContentSize\n', 1)
assert 'val scope = rememberCoroutineScope()' in s
s = s.replace('    val scope = rememberCoroutineScope()\n', '''    val scope = rememberCoroutineScope()
    val authScrollState = rememberScrollState()
''', 1)
assert 'verticalScroll(rememberScrollState())' in s
s = s.replace('verticalScroll(rememberScrollState())', 'verticalScroll(authScrollState)', 1)
needle = '    fun switchStep(next: AuthFlowStep, clearPassword: Boolean = true) {'
assert s.count(needle) == 1
s = s.replace(needle, '''    // Place the next step at its beginning, including on small screens.
    LaunchedEffect(step) { authScrollState.scrollTo(0) }

''' + needle, 1)
needle2 = '''                    Column(
                        modifier = Modifier.padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
'''
assert s.count(needle2) == 1
s = s.replace(needle2, '''                    Column(
                        modifier = Modifier.padding(18.dp).animateContentSize(animationSpec = tween(180)),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
''', 1)
p.write_text(s, encoding='utf-8')
print('Patched AuthScreen form rendering, scroll reset and smooth resize')
