/* @flow */
'use strict';

import AbstractMethod from './AbstractMethod';
import { validatePath, getPathFromIndex } from '../../utils/pathUtils';
import type { MessageResponse } from '../../device/DeviceCommands';

import * as UI from '../../constants/ui';
import { UiMessage } from '../CoreMessage';

import { getCoinInfoByCurrency, getCoinInfoFromPath, getCoinName } from '../../data/CoinInfo';
import { getPublicKeyLabel, isSegwitPath } from '../../utils/pathUtils';
import type { CoinInfo, UiPromiseResponse, CoreMessage } from 'flowtype';
import type { Identity, SignedIdentity } from 'flowtype/trezor';

type Params = {
    asyncChallenge: boolean;
    identity: Identity;
    challengeHidden: string;
    challengeVisual: string;
}

export default class RequestLogin extends AbstractMethod {

    params: Params;

    constructor(message: CoreMessage) {
        super(message);
        this.useEmptyPassphrase = true;
        this.requiredPermissions = ['read'];
        this.requiredFirmware = '1.0.0';
        this.useDevice = true;
        this.useUi = true;
        this.info = 'Login';

        const payload: any = message.payload;

        if (payload.hasOwnProperty('identity')) {
            if (typeof payload.identity !== 'object') {
                throw new Error('Parameter "identity" has invalid type. Object expected.');
            }
        }

        if (payload.hasOwnProperty('challengeHidden') && typeof payload.challengeHidden !== 'string') {
            throw new Error('Parameter "challengeHidden" has invalid type. String expected.');
        }

        if (payload.hasOwnProperty('challengeVisual') && typeof payload.challengeVisual !== 'string') {
            throw new Error('Parameter "challengeVisual" has invalid type. String expected.');
        }

        this.params = {
            asyncChallenge: payload.asyncChallenge,
            identity: payload.identity || {},
            challengeHidden: payload.challengeHidden || '',
            challengeVisual: payload.challengeVisual || '',
        }
    }

    async run(): Promise<SignedIdentity> {

        if (this.params.asyncChallenge) {
            // send request to developer
            this.postMessage(new UiMessage(UI.LOGIN_CHALLENGE_REQUEST));

            // wait for response from developer
            const uiResp: UiPromiseResponse = await this.createUiPromise(UI.LOGIN_CHALLENGE_RESPONSE, this.device).promise;
            const payload = uiResp.payload;
            if (typeof payload.hidden !== 'string') {
                throw new Error('Parameter "challengeHidden" is missing');
            }

            if (typeof payload.visual !== 'string') {
                throw new Error('Parameter "challengeVisual" is missing');
            }

            this.params.challengeHidden = payload.hidden;
            this.params.challengeVisual = payload.visual;
        }

        const response: MessageResponse<SignedIdentity> = await this.device.getCommands().signIdentity(
            this.params.identity,
            this.params.challengeHidden,
            this.params.challengeVisual
        );

        return response.message;
    }
}