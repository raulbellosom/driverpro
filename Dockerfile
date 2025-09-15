FROM odoo:18
USER root
ENV PIP_BREAK_SYSTEM_PACKAGES=1
# Si falla cryptography (poco común), descomenta la línea apt más abajo
# RUN apt-get update && apt-get install -y --no-install-recommends gcc python3-dev libssl-dev && rm -rf /var/lib/apt/lists/*
RUN pip3 install --no-cache-dir pywebpush cryptography
USER odoo
