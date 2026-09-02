/**
 * meta-quest-adb-port-forwarding.plugin.ts
 *
 * esbuild plugin to simplify forwarding a dev server to a Meta (Oculus/Quest) headset
 * using ADB reverse port forwarding and to optionally open the dev URL on the device.
 *
 * Purpose
 * - Automatically detect a connected Quest headset and create an ADB reverse mapping so
 *   the headset can reach the host computer's dev server at localhost:<port>.
 * - Provide helper warnings when multiple devices are connected and expose a
 *   small public API for selecting a specific device.
 * - Tested on Windows, macOS, and Linux with adb available on PATH or configured via `adbPath`.
 *
 * Usage (quick)
 * - In your esbuild configuration:
 *
 *   import { metaQuestAdbPortForwardingPlugin } from './scripts/meta-quest-adb-port-forwarding.plugin'
 *
 *   plugins: [metaQuestAdbPortForwardingPlugin({ port: 5379, adbPath: 'C:/path/to/adb.exe' })]
 *
 * Notes
 * - If `adbPath` is omitted, the plugin will try to run the `adb` binary from the environment PATH.
 * - On Windows prefer either a PATH entry or an absolute path with double backslashes (\\) or forward
 *   slashes. Example: `C:\\Android\\platform-tools\\adb.exe` or `C:/Android/platform-tools/adb.exe`.
 *[meta-quest-adb] Forwarded Meta Quest localhost:5379 to this computer with ADB (2G0YC1ZF7B04YY).
 * License: MIT (replace as appropriate)
 */
import {spawn} from 'node:child_process';
import type {Plugin} from 'esbuild';

/**
 * Options for the Meta Quest ADB port forwarding plugin.
 *
 * @property port Port to reverse from the Quest to the host machine.
 * @property adbPath Optional absolute path to the `adb` binary. If omitted the plugin will
 * attempt to invoke `adb` from the environment PATH. On Windows provide either a PATH entry or
 * an absolute path using double backslashes (\\) or forward slashes.
 * @property deviceSerial Optional ADB device serial string to target a specific headset when
 * multiple devices are connected. If omitted the plugin will attempt to detect a Quest device
 * automatically using adb metadata and getprop probing.
 */
export interface MetaQuestAdbPortForwardingOptions {
    port: number;
    adbPath?: string;
    deviceSerial?: string;
    /**
     * If true, the plugin will attempt to open the dev server URL on the Quest after
     * the ADB reverse mapping has been applied. Default: false.
     */
    openOnStart?: boolean;
}

export interface MetaQuestAdbPortForwardingPlugin {
    plugin: Plugin;
    forward(): Promise<void>;
}

interface AdbResult {
    stdout: string;
    stderr: string;
}

interface AdbDevice {
    serial: string;
    state: string;
    details: string;
}

interface PluginLogger {
    info(message: string): void;
    warn(message: string): void;
}

function buildAdbArgs(deviceSerial: string | undefined, ...args: string[]) {
    return deviceSerial ? ['-s', deviceSerial, ...args] : args;
}

function runAdb(adbPath: string, args: string[]) {
    return new Promise<AdbResult>((resolve, reject) => {
        const child = spawn(adbPath, args, {
            shell: false,
            windowsHide: true
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (chunk: Buffer | string) => {
            stdout += chunk.toString();
        });

        child.stderr.on('data', (chunk: Buffer | string) => {
            stderr += chunk.toString();
        });

        child.on('error', error => {
            reject(new Error(`Failed to start ADB at "${adbPath}": ${error.message}`));
        });

        child.on('close', code => {
            if (code === 0) {
                resolve({
                    stdout: stdout.trim(),
                    stderr: stderr.trim()
                });
                return;
            }

            const details = [stderr.trim(), stdout.trim()].filter(Boolean).join('\n');
            reject(new Error(`ADB exited with code ${code}.${details ? `\n${details}` : ''}`));
        });
    });
}

function parseAdbDevices(output: string) {
    return output
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('List of devices attached'))
        .map(line => {
            const match = /^(\S+)\s+(\S+)\s*(.*)$/.exec(line);
            if (!match) {
                return null;
            }

            const [, serial, state, details] = match;
            return {
                serial,
                state,
                details
            } satisfies AdbDevice;
        })
        .filter((device): device is AdbDevice => device !== null);
}

function hasQuestHints(value: string) {
    const lower = value.toLowerCase();
    return lower.includes('quest') || lower.includes('oculus') || lower.includes('meta');
}

function findQuestByAdbMetadata(devices: AdbDevice[]) {
    return devices.filter(device => hasQuestHints(device.details));
}

async function probeAdbProperty(adbPath: string, serial: string, propertyName: string) {
    try {
        const result = await runAdb(adbPath, ['-s', serial, 'shell', 'getprop', propertyName]);
        return result.stdout.trim();
    } catch {
        return '';
    }
}

async function findQuestByGetProp(adbPath: string, devices: AdbDevice[]) {
    const questDevices: AdbDevice[] = [];

    for (const device of devices) {
        const manufacturer = await probeAdbProperty(adbPath, device.serial, 'ro.product.manufacturer');
        const model = await probeAdbProperty(adbPath, device.serial, 'ro.product.model');
        const deviceName = await probeAdbProperty(adbPath, device.serial, 'ro.product.device');

        if (hasQuestHints(`${manufacturer} ${model} ${deviceName}`)) {
            questDevices.push(device);
        }
    }

    return questDevices;
}

function selectSingleSerial(candidates: AdbDevice[], logger: PluginLogger, reason: string) {
    if (candidates.length === 0) {
        return undefined;
    }

    if (candidates.length === 1) {
        return candidates[0].serial;
    }

    const [selected] = candidates;
    logger.warn(
        `[meta-quest-adb] ${reason}. Using ${selected.serial}. Set deviceSerial in the plugin options to target a specific headset.`
    );
    return selected.serial;
}

function toQuestLocalUrl(port: number) {
    return `http://localhost:${port}/`;
}

async function resolveTargetSerial(adbPath: string, configuredDeviceSerial: string | undefined, logger: PluginLogger) {
    if (configuredDeviceSerial) {
        return configuredDeviceSerial;
    }

    const devicesResult = await runAdb(adbPath, ['devices', '-l']);
    const connectedDevices = parseAdbDevices(devicesResult.stdout).filter(device => device.state === 'device');

    if (connectedDevices.length === 0) {
        logger.warn(
            '[meta-quest-adb] No authorized ADB devices detected. Connect and authorize your Quest, then rebuild.'
        );
        return undefined;
    }

    const metadataMatches = findQuestByAdbMetadata(connectedDevices);
    const metadataSelected = selectSingleSerial(
        metadataMatches,
        logger,
        'Multiple Quest devices were detected from adb metadata'
    );
    if (metadataSelected) {
        return metadataSelected;
    }

    const probedMatches = await findQuestByGetProp(adbPath, connectedDevices);
    const probedSelected = selectSingleSerial(
        probedMatches,
        logger,
        'Multiple Quest devices were detected from adb getprop data'
    );
    if (probedSelected) {
        return probedSelected;
    }

    if (connectedDevices.length === 1) {
        return connectedDevices[0].serial;
    }

    logger.warn(
        `[meta-quest-adb] Multiple ADB devices are connected (${connectedDevices.map(device => device.serial).join(', ')}), but no Quest could be identified automatically. Set deviceSerial in the plugin options.`
    );
    return undefined;
}

async function waitForTargetSerial(adbPath: string, configuredDeviceSerial: string | undefined, logger: PluginLogger) {
    for (let attempt = 0; attempt < 30; attempt++) {
        const devices = parseAdbDevices((await runAdb(adbPath, ['devices', '-l'])).stdout);
        const unauthorizedDevice = devices.find(device => device.state === 'unauthorized');

        if (!unauthorizedDevice) {
            return resolveTargetSerial(adbPath, configuredDeviceSerial, logger);
        }

        if (attempt === 0) {
            logger.info('[meta-quest-adb] Waiting for USB debugging authorization on the Quest...');
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return resolveTargetSerial(adbPath, configuredDeviceSerial, logger);
}

/**
 * Create the esbuild plugin that forwards the dev server port to a Meta Quest device via ADB.
 *
 * Remarks:
 * - After a successful build it uses `adb reverse tcp:<port> tcp:<port>` so the headset can
 *   access `http://localhost:<port>/` on the host machine.
 * - The plugin will try to automatically detect a Quest headset when `deviceSerial` is not set.
 * - When the esbuild context is disposed the plugin attempts to remove the reverse mapping.
 *
 * Example:
 *
 * plugins: [metaQuestAdbPortForwardingPlugin({
 *   port: 5379,
 *   adbPath: 'C:/Android/platform-tools/adb.exe'
 * })]
 *
 * @param options Configuration for the forwarded port, adb path, and optional device serial.
 * @returns An esbuild plugin.
 */
export function metaQuestAdbPortForwardingPlugin(
    options: MetaQuestAdbPortForwardingOptions
): MetaQuestAdbPortForwardingPlugin {
    const {port, adbPath = 'adb', deviceSerial, openOnStart = false} = options;
    let forwardedSerial: string | undefined;
    let reverseApplied = false;
    const logger: PluginLogger = console;

    const forward = async () => {
        if (reverseApplied) {
            return;
        }

        try {
            await runAdb(adbPath, ['start-server']);
            const serial = await waitForTargetSerial(adbPath, deviceSerial, logger);

            if (!serial) {
                logger.warn('[meta-quest-adb] Skipping ADB reverse because no Quest target could be selected.');
                return;
            }

            forwardedSerial = serial;
            await runAdb(adbPath, buildAdbArgs(serial, 'reverse', `tcp:${port}`, `tcp:${port}`));
            reverseApplied = true;
            logger.info(
                `[meta-quest-adb] Forwarded Meta Quest localhost:${port} to this computer with ADB (${serial}).`
            );

            if (openOnStart) {
                const url = toQuestLocalUrl(port);
                await runAdb(
                    adbPath,
                    buildAdbArgs(serial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url)
                );
                logger.info(`[meta-quest-adb] Opened ${url} on Quest (${serial}).`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn(`[meta-quest-adb] Unable to enable Meta Quest port forwarding for port ${port}.\n${message}`);
        }
    };

    return {
        forward,
        plugin: {
            name: 'meta-quest-adb-port-forwarding',
            setup(build) {
                build.onDispose(() => {
                    if (!reverseApplied || !forwardedSerial) {
                        return;
                    }

                    void runAdb(adbPath, buildAdbArgs(forwardedSerial, 'reverse', '--remove', `tcp:${port}`)).catch(
                        error => {
                            const message = error instanceof Error ? error.message : String(error);
                            logger.warn(
                                `[meta-quest-adb] Failed to remove Meta Quest port forwarding for port ${port}.\n${message}`
                            );
                        }
                    );
                });
            }
        }
    };
}
