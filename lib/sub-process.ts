import * as childProcess from 'child_process';
import { debug } from './index';
import { quoteAll } from 'shescape';

export function execute(command, args, options): Promise<string> {
  const spawnOptions: {
    shell: boolean;
    cwd?: string;
    env: Record<string, string | undefined>;
  } = { shell: false, env: { ...process.env } };
  if (options && options.cwd) {
    spawnOptions.cwd = options.cwd;
  }
  if (args) {
    args = quoteAll(args, spawnOptions);
  }

  // Before spawning an external process, we look if we need to restore the system proxy configuration,
  // which overides the cli internal proxy configuration.
  if (process.env.SNYK_SYSTEM_HTTP_PROXY !== undefined) {
    spawnOptions.env.HTTP_PROXY = process.env.SNYK_SYSTEM_HTTP_PROXY;
  }
  if (process.env.SNYK_SYSTEM_HTTPS_PROXY !== undefined) {
    spawnOptions.env.HTTPS_PROXY = process.env.SNYK_SYSTEM_HTTPS_PROXY;
  }
  if (process.env.SNYK_SYSTEM_NO_PROXY !== undefined) {
    spawnOptions.env.NO_PROXY = process.env.SNYK_SYSTEM_NO_PROXY;
  }

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const proc = childProcess.spawn(command, args, spawnOptions);
    proc.stdout.on('data', (data) => {
      stdout = stdout + data;
    });
    proc.stderr.on('data', (data) => {
      stderr = stderr + data;
    });

    proc.on('error', (err) => {
      debug(`Child process errored with: ${err.message}`);
    });

    proc.on('exit', (code) => {
      debug(`Child process exited with code: ${code}`);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        debug(
          `Child process failed with exit code: ${code}`,
          '----------------',
          'STDERR:',
          stderr,
          '----------------',
          'STDOUT:',
          stdout,
          '----------------',
        );

        const stdErrMessage = stderr ? `\nSTDERR:\n${stderr}` : '';
        const stdOutMessage = stdout ? `\nSTDOUT:\n${stdout}` : '';
        const debugSuggestion = process.env.DEBUG
          ? ''
          : `\nRun in debug mode (-d) to see STDERR and STDOUT.`;

        return reject(
          new Error(
            `Child process failed with exit code: ${code}.` +
              debugSuggestion +
              (stdErrMessage || stdOutMessage),
          ),
        );
      }
      resolve(stdout || stderr);
    });
  });
}
