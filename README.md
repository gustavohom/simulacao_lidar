# LiDAR ALS Flight Simulator

Este repositório contém o código-fonte de um simulador interativo de varredura a laser aerotransportado (**ALS - Airborne Laser Scanning**). A ferramenta foi desenvolvida com fins didáticos para demonstrar como diferentes configurações de voo e parâmetros do sensor influenciam diretamente a densidade, a distribuição e a qualidade da coleta de nuvens de pontos LiDAR.

Acesse a aplicação em tempo real: **[https://gustavohom.github.io/simulacao_lidar/](https://gustavohom.github.io/simulacao_lidar/)**

---

## 🎯 Objetivo

O simulador permite que estudantes, pesquisadores e profissionais visualizem de forma dinâmica o impacto de variáveis operacionais na estrutura dos dados coletados. O foco é facilitar a compreensão de conceitos como o nadir, sobreposição de faixas (overlap), frequência de pulso e a penetração do laser no dossel.

## ⚙️ Funcionalidades e Parâmetros Configuráveis

A página permite o ajuste fino de diversos parâmetros para observar o comportamento da coleta:

### 1. Parâmetros de Voo
* **Altitude:** Impacta a largura da faixa de varredura (*swath width*) e o tamanho do *footprint* do laser.
* **Velocidade da Aeronave:** Influencia a densidade de pontos ao longo da linha de voo.
* **Trajetória:** Observação do comportamento da aeronave e do retorno ao final das linhas.

### 2. Parâmetros do Sensor (LiDAR)
* **Frequência de Pulso (PRF):** Determina a quantidade de pulsos emitidos por segundo (Hz).
* **Densidade e Retornos:** Visualização didática de como o adensamento de pontos se comporta, incluindo a distribuição entre o topo do dossel e o solo (sub-bosque).
* **Ângulo de Varredura:** Define a amplitude lateral da coleta.

---

## 🚀 Tecnologias Utilizadas

* **React / TypeScript:** Para uma interface reativa e moderna.
* **Visualização 3D:** Renderização para demonstração da dinâmica de pulsos e retornos.
* **GitHub Pages:** Hospedagem do simulador.

## 📄 Licença

Este projeto está licenciado sob a **Licença MIT**.

---
