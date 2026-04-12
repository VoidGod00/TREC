import logging
import sys


def setup_logging(debug: bool = False):
    level = logging.DEBUG if debug else logging.INFO
    logging.basicConfig(
        stream=sys.stdout,
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


class _Logger:
    """Thin wrapper so the rest of the codebase can call logger.info/debug/error."""
    def __init__(self):
        self._log = logging.getLogger("trec")

    def info(self, msg, **kw):
        self._log.info(msg + (" " + str(kw) if kw else ""))

    def debug(self, msg, **kw):
        self._log.debug(msg + (" " + str(kw) if kw else ""))

    def warning(self, msg, **kw):
        self._log.warning(msg + (" " + str(kw) if kw else ""))

    def error(self, msg, **kw):
        self._log.error(msg + (" " + str(kw) if kw else ""))


logger = _Logger()
