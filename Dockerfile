FROM odoo:18
USER root
ENV PIP_BREAK_SYSTEM_PACKAGES=1
RUN pip3 install --no-cache-dir pywebpush cryptography
USER odoo
