from subprocess import Popen, PIPE, CalledProcessError


def run_bash_command(cmd):
    try:
        print(f"---> running bash: {cmd}")
        with Popen(cmd, shell=True, stdout=PIPE, bufsize=1, universal_newlines=True) as p:
            for line in p.stdout:
                print(line, end='')

        if p.returncode != 0:
            raise CalledProcessError(p.returncode, p.args)

    except Exception as e:
        print(e)
        raise OSError
