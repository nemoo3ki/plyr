// ==========================================================================
// Fullscreen wrapper
// https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API#prefixing
// ==========================================================================

import utils from './utils';

const browser = utils.getBrowser();

function onChange() {
    if (!this.enabled) {
        return;
    }

    // Update toggle button
    const button = this.player.elements.buttons.fullscreen;
    if (utils.is.element(button)) {
        utils.toggleState(button, this.active);
    }

    // Trigger an event
    utils.dispatchEvent(this.target, this.active ? 'enterfullscreen' : 'exitfullscreen', true);

    // Trap focus in container
    if (!browser.isIos) {
        utils.trapFocus.call(this.player, this.target, this.active);
    }
}

function toggleFallback(toggle = false) {
    // Store or restore scroll position
    if (toggle) {
        this.scrollPosition = {
            x: window.scrollX || 0,
            y: window.scrollY || 0,
        };
    } else {
        window.scrollTo(this.scrollPosition.x, this.scrollPosition.y);
    }

    // Toggle scroll
    document.body.style.overflow = toggle ? 'hidden' : '';

    // Toggle class hook
    utils.toggleClass(this.target, this.player.config.classNames.fullscreen.fallback, toggle);

    // Toggle button and fire events
    onChange.call(this);
}

class Fullscreen {
    constructor(player) {
        // Keep reference to parent
        this.player = player;

        // Get prefix
        this.prefix = Fullscreen.prefix;
        this.name = Fullscreen.name;

        // Scroll position
        this.scrollPosition = { x: 0, y: 0 };

        // Register event listeners
        // Handle event (incase user presses escape etc)
        utils.on(document, this.prefix === 'ms' ? 'MSFullscreenChange' : `${this.prefix}fullscreenchange`, () => {
            // TODO: Filter for target??
            onChange.call(this);
        });

        // Fullscreen toggle on double click
        utils.on(this.player.elements.container, 'dblclick', event => {
            // Ignore double click in controls
            if (this.player.elements.controls.contains(event.target)) {
                return;
            }

            this.toggle();
        });

        // Update the UI
        this.update();
    }

    // Determine if native supported
    static get native() {
        return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled);
    }

    // Get the prefix for handlers
    static get prefix() {
        // No prefix
        if (utils.is.function(document.exitFullscreen)) {
            return false;
        }

        // Check for fullscreen support by vendor prefix
        let value = '';
        const prefixes = [
            'webkit',
            'moz',
            'ms',
        ];

        prefixes.some(pre => {
            if (utils.is.function(document[`${pre}ExitFullscreen`]) || utils.is.function(document[`${pre}CancelFullScreen`])) {
                value = pre;
                return true;
            }

            return false;
        });

        return value;
    }

    static get name() {
        return this.prefix === 'moz' ? 'FullScreen' : 'Fullscreen';
    }

    // Determine if fullscreen is enabled
    get enabled() {
        return (
            (Fullscreen.native || this.player.config.fullscreen.fallback) &&
            this.player.config.fullscreen.enabled &&
            this.player.supported.ui &&
            this.player.isVideo
        );
    }

    // Get active state
    get active() {
        if (!this.enabled) {
            return false;
        }

        // Fallback using classname
        if (!Fullscreen.native) {
            return utils.hasClass(this.target, this.player.config.classNames.fullscreen.fallback);
        }

        const element = !this.prefix ? document.fullscreenElement : document[`${this.prefix}${this.name}Element`];

        return element === this.target;
    }

    // Get target element
    get target() {
        return browser.isIos && this.player.config.fullscreen.iosNative ? this.player.media : this.player.elements.container;
    }

    // Update UI
    update() {
        if (this.enabled) {
            this.player.debug.log(`${Fullscreen.native ? 'Native' : 'Fallback'} fullscreen enabled`);
        } else {
            this.player.debug.log('Fullscreen not supported and fallback disabled');
        }

        // Add styling hook to show button
        utils.toggleClass(this.player.elements.container, this.player.config.classNames.fullscreen.enabled, this.enabled);
    }

    // Make an element fullscreen
    enter() {
        if (!this.enabled) {
            return;
        }

        // iOS native fullscreen doesn't need the request step
        if (browser.isIos && this.player.config.fullscreen.iosNative) {
            if (this.player.playing) {
                this.target.webkitEnterFullscreen();
            }
        } else if (!Fullscreen.native) {
            toggleFallback.call(this, true);
        } else if (!this.prefix) {
            this.target.requestFullscreen();
        } else if (!utils.is.empty(this.prefix)) {
            this.target[`${this.prefix}Request${this.name}`]();
        }
    }

    // Bail from fullscreen
    exit() {
        if (!this.enabled) {
            return;
        }

        // iOS native fullscreen
        if (browser.isIos && this.player.config.fullscreen.iosNative) {
            this.target.webkitExitFullscreen();
            this.player.play();
        } else if (!Fullscreen.native) {
            toggleFallback.call(this, false);
        } else if (!this.prefix) {
            document.cancelFullScreen();
        } else if (!utils.is.empty(this.prefix)) {
            const action = this.prefix === 'moz' ? 'Cancel' : 'Exit';
            document[`${this.prefix}${action}${this.name}`]();
        }
    }

    // Toggle state
    toggle() {
        if (!this.active) {
            this.enter();
        } else {
            this.exit();
        }
    }
}

export default Fullscreen;
