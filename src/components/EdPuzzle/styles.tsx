import { css } from '@emotion/react';

export const styles = css`
      body {
        font-family: 'Poppins', sans-serif;
        background-color: #1d1c1cff;
        color: #a99dfaff;
        text-align: center;
        margin: 0;
        padding: 10px;
        font-size: 16px;
      }

      .container {
        margin: auto;
        padding: 20px;
        background-color: #2b292eff;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        width: 90%;
        min-width: 350px;
        position: relative;
        overflow: hidden;
      }

      .container::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(45deg, #7d7898ff, #a99dfaff);
        animation: gradient 10s ease infinite;
        z-index: -1;
      }

      @keyframes gradient {
        0% {
          transform: translate(0%, 0%);
        }

        50% {
          transform: translate(50%, 50%);
        }

        100% {
          transform: translate(0%, 0%);
        }
      }

      .logo {
        height: 60px;
        margin: 10px auto;
        display: block;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0% {
          transform: scale(1);
        }

        50% {
          transform: scale(1.1);
        }

        100% {
          transform: scale(1);
        }
      }

      h1 {
        font-weight: 600;
        margin: 10px 0;
        color: #a99dfaff;
      }

      div {
        margin-bottom: 15px;
      }

      label {
        font-weight: 600;
        color: #a99dfaff;
      }

      input[type='checkbox'] {
        margin-left: 5px;
      }

      button {
        background-color: #44475a;
        border: none;
        padding: 10px 20px;
        font-size: 16px;
        cursor: pointer;
        border-radius: 8px;
        color: #f8f8f2;
        transition: background-color 0.3s;
        margin: 5px;
      }

      button:hover {
        background-color: #6272a4;
      }

      .button-icon {
        margin-right: 5px;
      }

      @keyframes iconAnimation {
        0% {
          transform: scale(1);
        }

        50% {
          transform: scale(1.2);
        }

        100% {
          transform: scale(1);
        }
      }
      .switch {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 24px;
        margin-left: 10px;
      }

      .switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #6272a4;
        transition: 0.4s;
        border-radius: 24px;
      }

      .slider:before {
        position: absolute;
        content: '';
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: #f8f8f2;
        transition: 0.4s;
        border-radius: 50%;
      }

      input:checked + .slider {
        background-color: #50fa7b;
      }

      input:checked + .slider:before {
        transform: translateX(26px);
      }
`;