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
s = s.replace('import androidx.compose.foundation.BorderStroke\n', 'import androidx.compose.foundation.BorderStroke\nimport androidx.compose.foundation.ExperimentalFoundationApi\n', 1)
s = s.replace('import androidx.compose.animation.AnimatedContent\n', '', 1)
s = s.replace('import androidx.compose.animation.fadeIn\n', '', 1)
s = s.replace('import androidx.compose.animation.fadeOut\n', '', 1)
s = s.replace('import androidx.compose.animation.togetherWith\n', '', 1)
s = s.replace('import androidx.compose.runtime.Composable\n', 'import androidx.compose.runtime.Composable\nimport androidx.compose.runtime.LaunchedEffect\nimport androidx.compose.runtime.key\n', 1)
# The relocation modifier is explicitly experimental in the current Compose BOM.
s = s.replace('@Composable\nfun AuthScreen(', '@OptIn(ExperimentalFoundationApi::class)\n@Composable\nfun AuthScreen(', 1)
s = s.replace('import androidx.compose.animation.animateColor\n', 'import androidx.compose.animation.animateColor\nimport androidx.compose.animation.animateContentSize\nimport androidx.compose.foundation.relocation.BringIntoViewRequester\nimport androidx.compose.foundation.relocation.bringIntoViewRequester\n', 1)
assert 'val scope = rememberCoroutineScope()' in s
s = s.replace('    val scope = rememberCoroutineScope()\n', '''    val scope = rememberCoroutineScope()
    val authScrollState = rememberScrollState()
    val errorBringIntoViewRequester = remember { BringIntoViewRequester() }
''', 1)
assert 'verticalScroll(rememberScrollState())' in s
s = s.replace('verticalScroll(rememberScrollState())', 'verticalScroll(authScrollState)', 1)
needle = '    fun switchStep(next: AuthFlowStep, clearPassword: Boolean = true) {'
assert s.count(needle) == 1
s = s.replace(needle, '''    // Place the next step at its beginning, including on small screens.
    LaunchedEffect(step) { authScrollState.scrollTo(0) }
    // Bring validation feedback into view even when the sign-in button is far below
    // the fold on small Android screens. Scrolling to the top hides the banner.
    LaunchedEffect(errorMessage) {
        if (errorMessage != null) errorBringIntoViewRequester.bringIntoView()
    }

''' + needle, 1)
needle2 = '''                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
'''
assert s.count(needle2) == 1
s = s.replace(needle2, '''                    Column(
                        modifier = Modifier.padding(18.dp).animateContentSize(animationSpec = tween(180)),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
''', 1)
# Give the error banner an explicit relocation target: unlike scrolling to the
# top this correctly handles a tall brand header and a small screen.
banner = '''                                    .fillMaxWidth()
                                    .testTag("auth_error_banner")'''
replacement = '''                                    .fillMaxWidth()
                                    .bringIntoViewRequester(errorBringIntoViewRequester)
                                    .testTag("auth_error_banner")'''
assert s.count(banner) == 1, 'Expected one attached login error banner'
s = s.replace(banner, replacement, 1)
# The Step 1 token shortcut appears below the viewport on 320x470 Robolectric
# test devices. Compose performClick() sends a position-based event, so the
# scrollable form must be scrolled to that control first.
test_file = p.parents[4] / 'test/java/com/example/ui/auth/AuthComponentsTest.kt'
if not test_file.is_file():
    test_file = Path('integrated/app/src/test/java/com/example/ui/auth/AuthComponentsTest.kt')
assert test_file.is_file(), f'Missing Compose registration test: {test_file}'
test_source = test_file.read_text(encoding='utf-8')
old_tap = '        composeRule.onNodeWithTag("already_have_verify_token_button").performClick()'
new_tap = '''        composeRule.onNodeWithTag("already_have_verify_token_button").performScrollTo()
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("already_have_verify_token_button").assertIsDisplayed()
        composeRule.onNodeWithTag("already_have_verify_token_button").performClick()'''
if old_tap not in test_source and new_tap not in test_source:
    raise SystemExit('Expected token shortcut click not found in Compose test')
if old_tap in test_source:
    test_source = test_source.replace(old_tap, new_tap, 1)
if ('import androidx.compose.ui.test.performScrollTo' not in test_source
        and 'import androidx.compose.ui.test.*' not in test_source):
    test_source = test_source.replace('import androidx.compose.ui.test.performClick',
                                      'import androidx.compose.ui.test.performScrollTo' + chr(10) + 'import androidx.compose.ui.test.performClick', 1)
# In the small Robolectric viewport, recovery links and inputs are below
# the fold. Test actual user interactions after scrolling each control into view.
for tag in (
    'forgot_password_link',
    'forgot_email_input',
    'forgot_submit_button',
    'proceed_to_reset_password_button',
    'reset_token_input',
    'reset_new_password_input',
    'reset_confirm_password_input',
    'reset_submit_button',
):
    prefix = f'        composeRule.onNodeWithTag("{tag}")'
    scroll = prefix + '.performScrollTo()'
    if scroll in test_source:
        continue
    targets = [line for line in test_source.splitlines()
               if line.startswith(prefix) and ('.performClick()' in line or '.performTextInput(' in line)]
    assert len(targets) == 1, f'Expected one action for {tag}, got {len(targets)}'
    test_source = test_source.replace(targets[0], scroll + chr(10) + targets[0], 1)
# A Compose click on a button below the Robolectric viewport may not dispatch
# until the button is physically visible. Verify the click rather than assuming it.
login_click = '        composeRule.onNodeWithTag("login_submit_button").performClick()'
login_scroll_click = '''        composeRule.onNodeWithTag("login_submit_button").performScrollTo()
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("login_submit_button").assertIsDisplayed()
        composeRule.onNodeWithTag("login_submit_button").performClick()'''
if test_source.count(login_click) == 1:
    test_source = test_source.replace(login_click, login_scroll_click, 1)
elif login_scroll_click not in test_source:
    raise SystemExit('Expected login submit action missing from Compose test')
# Assert validation exists, then scroll the native Compose semantics node into
# view in Robolectric's 320x470 viewport. This tests screen accessibility, not
# an assumption about which fragment of the tall auth card is initially visible.
err = '        composeRule.onNodeWithTag("auth_error_banner").assertIsDisplayed()'
err_scroll = '''        composeRule.onNodeWithTag("auth_error_banner").assertExists()
        composeRule.onNodeWithTag("auth_error_banner").performScrollTo()
        composeRule.onNodeWithTag("auth_error_banner").assertIsDisplayed()'''
if test_source.count(err) == 1:
    test_source = test_source.replace(err, err_scroll, 1)
elif err_scroll not in test_source:
    raise SystemExit('Expected password-validation assertion not found')
test_file.write_text(test_source, encoding='utf-8')
p.write_text(s, encoding='utf-8')
print('Patched AuthScreen form rendering, scroll reset and smooth resize')
