import React from 'react';
import SwitchControl from './SwitchControl';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

describe('SwitchControl component', () => {

    it('calls change handler when off and toggled', () => {
        const changeHandler = jest.fn();
        render(
            <SwitchControl name={''} checked={false} onChange={changeHandler}/>
        );

        const toggle = screen.getByRole('checkbox');
        fireEvent.click(toggle);

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenCalledWith(true);
    });

    it('calls change handler when on and toggled', () => {
        const changeHandler = jest.fn();
        render(
            <SwitchControl name={''} checked={true} onChange={changeHandler}/>
        );

        const toggle = screen.getByRole('checkbox');
        fireEvent.click(toggle);

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenCalledWith(false);
    });
});
